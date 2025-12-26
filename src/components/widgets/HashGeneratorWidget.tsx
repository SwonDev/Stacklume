"use client";

import { useState, useEffect } from "react";
import { Hash, Copy, RefreshCw, Check, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Widget } from "@/types/widget";
import { useWidgetStore } from "@/stores/widget-store";

interface HashGeneratorWidgetProps {
  widget: Widget;
}

// MD5 implementation
function md5(str: string): string {
  // Simple MD5 implementation using built-in crypto if available
  // For production, you might want to use a library
  // This is a basic implementation for demonstration
  const utf8 = new TextEncoder().encode(str);

  function rotateLeft(value: number, shift: number): number {
    return (value << shift) | (value >>> (32 - shift));
  }

  function addUnsigned(x: number, y: number): number {
    const lsw = (x & 0xFFFF) + (y & 0xFFFF);
    const msw = (x >> 16) + (y >> 16) + (lsw >> 16);
    return (msw << 16) | (lsw & 0xFFFF);
  }

  const blocks: number[] = [];
  const msgLength = utf8.length;
  const blockCount = ((msgLength + 8) >>> 6) + 1;

  for (let i = 0; i < blockCount * 16; i++) {
    blocks[i] = 0;
  }

  for (let i = 0; i < msgLength; i++) {
    blocks[i >>> 2] |= utf8[i] << ((i % 4) * 8);
  }

  blocks[msgLength >>> 2] |= 0x80 << ((msgLength % 4) * 8);
  blocks[blockCount * 16 - 2] = msgLength * 8;

  let a = 0x67452301;
  let b = 0xEFCDAB89;
  let c = 0x98BADCFE;
  let d = 0x10325476;

  const F = (x: number, y: number, z: number) => (x & y) | (~x & z);
  const G = (x: number, y: number, z: number) => (x & z) | (y & ~z);
  const H = (x: number, y: number, z: number) => x ^ y ^ z;
  const I = (x: number, y: number, z: number) => y ^ (x | ~z);

  const FF = (a: number, b: number, c: number, d: number, x: number, s: number, ac: number) => {
    a = addUnsigned(a, addUnsigned(addUnsigned(F(b, c, d), x), ac));
    return addUnsigned(rotateLeft(a, s), b);
  };

  const GG = (a: number, b: number, c: number, d: number, x: number, s: number, ac: number) => {
    a = addUnsigned(a, addUnsigned(addUnsigned(G(b, c, d), x), ac));
    return addUnsigned(rotateLeft(a, s), b);
  };

  const HH = (a: number, b: number, c: number, d: number, x: number, s: number, ac: number) => {
    a = addUnsigned(a, addUnsigned(addUnsigned(H(b, c, d), x), ac));
    return addUnsigned(rotateLeft(a, s), b);
  };

  const II = (a: number, b: number, c: number, d: number, x: number, s: number, ac: number) => {
    a = addUnsigned(a, addUnsigned(addUnsigned(I(b, c, d), x), ac));
    return addUnsigned(rotateLeft(a, s), b);
  };

  for (let i = 0; i < blockCount; i++) {
    const offset = i * 16;
    const aa = a, bb = b, cc = c, dd = d;

    a = FF(a, b, c, d, blocks[offset + 0], 7, 0xD76AA478);
    d = FF(d, a, b, c, blocks[offset + 1], 12, 0xE8C7B756);
    c = FF(c, d, a, b, blocks[offset + 2], 17, 0x242070DB);
    b = FF(b, c, d, a, blocks[offset + 3], 22, 0xC1BDCEEE);
    a = FF(a, b, c, d, blocks[offset + 4], 7, 0xF57C0FAF);
    d = FF(d, a, b, c, blocks[offset + 5], 12, 0x4787C62A);
    c = FF(c, d, a, b, blocks[offset + 6], 17, 0xA8304613);
    b = FF(b, c, d, a, blocks[offset + 7], 22, 0xFD469501);
    a = FF(a, b, c, d, blocks[offset + 8], 7, 0x698098D8);
    d = FF(d, a, b, c, blocks[offset + 9], 12, 0x8B44F7AF);
    c = FF(c, d, a, b, blocks[offset + 10], 17, 0xFFFF5BB1);
    b = FF(b, c, d, a, blocks[offset + 11], 22, 0x895CD7BE);
    a = FF(a, b, c, d, blocks[offset + 12], 7, 0x6B901122);
    d = FF(d, a, b, c, blocks[offset + 13], 12, 0xFD987193);
    c = FF(c, d, a, b, blocks[offset + 14], 17, 0xA679438E);
    b = FF(b, c, d, a, blocks[offset + 15], 22, 0x49B40821);

    a = GG(a, b, c, d, blocks[offset + 1], 5, 0xF61E2562);
    d = GG(d, a, b, c, blocks[offset + 6], 9, 0xC040B340);
    c = GG(c, d, a, b, blocks[offset + 11], 14, 0x265E5A51);
    b = GG(b, c, d, a, blocks[offset + 0], 20, 0xE9B6C7AA);
    a = GG(a, b, c, d, blocks[offset + 5], 5, 0xD62F105D);
    d = GG(d, a, b, c, blocks[offset + 10], 9, 0x02441453);
    c = GG(c, d, a, b, blocks[offset + 15], 14, 0xD8A1E681);
    b = GG(b, c, d, a, blocks[offset + 4], 20, 0xE7D3FBC8);
    a = GG(a, b, c, d, blocks[offset + 9], 5, 0x21E1CDE6);
    d = GG(d, a, b, c, blocks[offset + 14], 9, 0xC33707D6);
    c = GG(c, d, a, b, blocks[offset + 3], 14, 0xF4D50D87);
    b = GG(b, c, d, a, blocks[offset + 8], 20, 0x455A14ED);
    a = GG(a, b, c, d, blocks[offset + 13], 5, 0xA9E3E905);
    d = GG(d, a, b, c, blocks[offset + 2], 9, 0xFCEFA3F8);
    c = GG(c, d, a, b, blocks[offset + 7], 14, 0x676F02D9);
    b = GG(b, c, d, a, blocks[offset + 12], 20, 0x8D2A4C8A);

    a = HH(a, b, c, d, blocks[offset + 5], 4, 0xFFFA3942);
    d = HH(d, a, b, c, blocks[offset + 8], 11, 0x8771F681);
    c = HH(c, d, a, b, blocks[offset + 11], 16, 0x6D9D6122);
    b = HH(b, c, d, a, blocks[offset + 14], 23, 0xFDE5380C);
    a = HH(a, b, c, d, blocks[offset + 1], 4, 0xA4BEEA44);
    d = HH(d, a, b, c, blocks[offset + 4], 11, 0x4BDECFA9);
    c = HH(c, d, a, b, blocks[offset + 7], 16, 0xF6BB4B60);
    b = HH(b, c, d, a, blocks[offset + 10], 23, 0xBEBFBC70);
    a = HH(a, b, c, d, blocks[offset + 13], 4, 0x289B7EC6);
    d = HH(d, a, b, c, blocks[offset + 0], 11, 0xEAA127FA);
    c = HH(c, d, a, b, blocks[offset + 3], 16, 0xD4EF3085);
    b = HH(b, c, d, a, blocks[offset + 6], 23, 0x04881D05);
    a = HH(a, b, c, d, blocks[offset + 9], 4, 0xD9D4D039);
    d = HH(d, a, b, c, blocks[offset + 12], 11, 0xE6DB99E5);
    c = HH(c, d, a, b, blocks[offset + 15], 16, 0x1FA27CF8);
    b = HH(b, c, d, a, blocks[offset + 2], 23, 0xC4AC5665);

    a = II(a, b, c, d, blocks[offset + 0], 6, 0xF4292244);
    d = II(d, a, b, c, blocks[offset + 7], 10, 0x432AFF97);
    c = II(c, d, a, b, blocks[offset + 14], 15, 0xAB9423A7);
    b = II(b, c, d, a, blocks[offset + 5], 21, 0xFC93A039);
    a = II(a, b, c, d, blocks[offset + 12], 6, 0x655B59C3);
    d = II(d, a, b, c, blocks[offset + 3], 10, 0x8F0CCC92);
    c = II(c, d, a, b, blocks[offset + 10], 15, 0xFFEFF47D);
    b = II(b, c, d, a, blocks[offset + 1], 21, 0x85845DD1);
    a = II(a, b, c, d, blocks[offset + 8], 6, 0x6FA87E4F);
    d = II(d, a, b, c, blocks[offset + 15], 10, 0xFE2CE6E0);
    c = II(c, d, a, b, blocks[offset + 6], 15, 0xA3014314);
    b = II(b, c, d, a, blocks[offset + 13], 21, 0x4E0811A1);
    a = II(a, b, c, d, blocks[offset + 4], 6, 0xF7537E82);
    d = II(d, a, b, c, blocks[offset + 11], 10, 0xBD3AF235);
    c = II(c, d, a, b, blocks[offset + 2], 15, 0x2AD7D2BB);
    b = II(b, c, d, a, blocks[offset + 9], 21, 0xEB86D391);

    a = addUnsigned(a, aa);
    b = addUnsigned(b, bb);
    c = addUnsigned(c, cc);
    d = addUnsigned(d, dd);
  }

  const wordToHex = (val: number) => {
    let hex = '';
    for (let i = 0; i < 4; i++) {
      hex += ((val >>> (i * 8)) & 0xFF).toString(16).padStart(2, '0');
    }
    return hex;
  };

  return wordToHex(a) + wordToHex(b) + wordToHex(c) + wordToHex(d);
}

// SHA hash function using Web Crypto API
async function generateHash(text: string, algorithm: 'md5' | 'sha1' | 'sha256' | 'sha512'): Promise<string> {
  if (algorithm === 'md5') {
    return md5(text);
  }

  // Map algorithm names to Web Crypto API names
  const algorithmMap = {
    'sha1': 'SHA-1',
    'sha256': 'SHA-256',
    'sha512': 'SHA-512',
  };

  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest(algorithmMap[algorithm], data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

  return hashHex;
}

export function HashGeneratorWidget({ widget }: HashGeneratorWidgetProps) {
  const { updateWidget } = useWidgetStore();
  const [inputText, setInputText] = useState<string>("");
  const [hashOutput, setHashOutput] = useState<string>("");
  const [algorithm, setAlgorithm] = useState<'md5' | 'sha1' | 'sha256' | 'sha512'>(
    (widget.config?.hashAlgorithm as 'md5' | 'sha1' | 'sha256' | 'sha512') || 'sha256'
  );
  const [isUpperCase, setIsUpperCase] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [autoGenerate, setAutoGenerate] = useState(false);

  // Load saved input from widget config
  useEffect(() => {
    const savedInput = widget.config?.lastInput || "";
    setInputText(savedInput);
    if (savedInput) {
      handleGenerate(savedInput, algorithm);
    }
  }, []);

  // Auto-generate hash when typing (debounced for short inputs)
  useEffect(() => {
    if (!autoGenerate || !inputText) return;

    const timer = setTimeout(() => {
      if (inputText.length < 1000) {
        handleGenerate(inputText, algorithm);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [inputText, algorithm, autoGenerate]);

  const handleGenerate = async (text?: string, algo?: typeof algorithm) => {
    const textToHash = text || inputText;
    const algoToUse = algo || algorithm;

    if (!textToHash) {
      setHashOutput("");
      return;
    }

    setIsGenerating(true);

    try {
      const hash = await generateHash(textToHash, algoToUse);
      setHashOutput(hash);

      // Save to widget config
      updateWidget(widget.id, {
        config: {
          ...widget.config,
          lastInput: textToHash,
          hashAlgorithm: algoToUse,
          hashHistory: [
            {
              input: textToHash.substring(0, 50) + (textToHash.length > 50 ? "..." : ""),
              algorithm: algoToUse,
              hash: hash,
            },
            ...(widget.config?.hashHistory || []).slice(0, 9),
          ],
        },
      });
    } catch (error) {
      console.error("Error generating hash:", error);
      setHashOutput("Error generating hash");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = async () => {
    if (!hashOutput) return;

    const textToCopy = isUpperCase ? hashOutput.toUpperCase() : hashOutput;
    await navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClear = () => {
    setInputText("");
    setHashOutput("");
  };

  const displayHash = isUpperCase ? hashOutput.toUpperCase() : hashOutput;
  const hashLength = hashOutput.length;

  return (
    <div className="@container h-full w-full">
      <div className="flex flex-col h-full p-3 @sm:p-4 @md:p-5 gap-3 @sm:gap-4">
        {/* Header */}
        <div className="flex items-center gap-2 @sm:gap-3">
          <div className="w-8 h-8 @sm:w-9 @sm:h-9 @md:w-10 @md:h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Hash className="w-4 h-4 @sm:w-4.5 @sm:h-4.5 @md:w-5 @md:h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm @sm:text-base @md:text-lg font-semibold truncate">
              Hash Generator
            </h3>
            <p className="text-xs @sm:text-xs @md:text-sm text-muted-foreground truncate">
              Generate cryptographic hashes
            </p>
          </div>
        </div>

        {/* Algorithm Selector */}
        <div className="space-y-2">
          <Label className="text-xs @sm:text-sm">Algorithm</Label>
          <Select
            value={algorithm}
            onValueChange={(value) => {
              const newAlgo = value as typeof algorithm;
              setAlgorithm(newAlgo);
              if (inputText && autoGenerate) {
                handleGenerate(inputText, newAlgo);
              }
            }}
          >
            <SelectTrigger className="h-8 @sm:h-9 text-xs @sm:text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="md5">MD5 (128-bit)</SelectItem>
              <SelectItem value="sha1">SHA-1 (160-bit)</SelectItem>
              <SelectItem value="sha256">SHA-256 (256-bit)</SelectItem>
              <SelectItem value="sha512">SHA-512 (512-bit)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Input Text Area */}
        <div className="space-y-2 flex-1 min-h-0 flex flex-col">
          <Label className="text-xs @sm:text-sm">Input Text</Label>
          <Textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Enter text to hash..."
            className="flex-1 min-h-[60px] resize-none text-xs @sm:text-sm font-mono"
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {inputText.length} characters
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setAutoGenerate(!autoGenerate)}
                className={`h-6 @sm:h-7 px-2 text-xs ${autoGenerate ? 'bg-primary/10' : ''}`}
              >
                Auto-generate
              </Button>
            </div>
          </div>
        </div>

        {/* Generate Button */}
        <Button
          onClick={() => handleGenerate()}
          disabled={!inputText || isGenerating}
          className="w-full gap-2 h-8 @sm:h-9 text-xs @sm:text-sm"
        >
          {isGenerating ? (
            <>
              <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <ArrowRight className="w-3.5 h-3.5 @sm:w-4 @sm:h-4" />
              Generate Hash
            </>
          )}
        </Button>

        {/* Hash Output */}
        <AnimatePresence mode="wait">
          {hashOutput && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-2"
            >
              <div className="flex items-center justify-between">
                <Label className="text-xs @sm:text-sm">Hash Output</Label>
                <div className="flex items-center gap-1 @sm:gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsUpperCase(!isUpperCase)}
                    className="h-6 @sm:h-7 px-2 text-xs"
                  >
                    {isUpperCase ? 'ABC' : 'abc'}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCopy}
                    className="h-6 @sm:h-7 px-2 text-xs gap-1"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3 h-3" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        Copy
                      </>
                    )}
                  </Button>
                </div>
              </div>
              <div className="relative">
                <div className="p-3 @sm:p-4 bg-muted/50 rounded-lg border">
                  <code className="text-xs @sm:text-sm font-mono break-all leading-relaxed text-foreground">
                    {displayHash}
                  </code>
                </div>
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="mt-2 flex items-center justify-between text-xs text-muted-foreground"
                >
                  <span>{hashLength} characters</span>
                  <span>{algorithm.toUpperCase()}</span>
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Empty state */}
        {!hashOutput && !inputText && (
          <div className="flex-1 flex flex-col items-center justify-center text-center gap-2 @sm:gap-3 py-4 @sm:py-6">
            <div className="w-12 h-12 @sm:w-14 @sm:h-14 rounded-full bg-muted/50 flex items-center justify-center">
              <Hash className="w-5 h-5 @sm:w-6 @sm:h-6 text-muted-foreground" />
            </div>
            <div className="space-y-1">
              <p className="text-xs @sm:text-sm font-medium text-muted-foreground">
                No hash generated
              </p>
              <p className="text-xs text-muted-foreground/60">
                Enter text and click generate
              </p>
            </div>
          </div>
        )}

        {/* History - only show on larger containers */}
        {widget.config?.hashHistory && widget.config.hashHistory.length > 0 && (
          <div className="hidden @lg:block space-y-2 border-t pt-3">
            <Label className="text-xs">Recent Hashes</Label>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {widget.config.hashHistory.slice(0, 3).map((item, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="p-2 bg-muted/30 rounded text-xs space-y-1 cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => {
                    setInputText(item.input);
                    setAlgorithm(item.algorithm as typeof algorithm);
                    handleGenerate(item.input, item.algorithm as typeof algorithm);
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground truncate flex-1">
                      {item.input}
                    </span>
                    <span className="text-primary font-mono ml-2">
                      {item.algorithm.toUpperCase()}
                    </span>
                  </div>
                  <code className="text-muted-foreground/60 font-mono truncate block">
                    {item.hash}
                  </code>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Action buttons */}
        {(inputText || hashOutput) && (
          <Button
            variant="outline"
            onClick={handleClear}
            className="w-full h-8 text-xs gap-2"
          >
            <RefreshCw className="w-3 h-3" />
            Clear All
          </Button>
        )}
      </div>
    </div>
  );
}
