"use client";

import { useState, useCallback, useEffect } from "react";
import type { Widget, WidgetConfig } from "@/types/widget";
import { useWidgetStore } from "@/stores/widget-store";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Copy, RefreshCw, FileText } from "lucide-react";

interface LoremIpsumWidgetProps {
  widget: Widget;
}

type GenerationType = "paragraphs" | "words" | "sentences";

interface LoremIpsumConfig {
  generationType?: GenerationType;
  amount?: number;
  startWithLorem?: boolean;
  generatedText?: string;
}

// Comprehensive Lorem Ipsum word list
const LOREM_WORDS = [
  "lorem", "ipsum", "dolor", "sit", "amet", "consectetur", "adipiscing", "elit",
  "sed", "do", "eiusmod", "tempor", "incididunt", "ut", "labore", "et", "dolore",
  "magna", "aliqua", "enim", "ad", "minim", "veniam", "quis", "nostrud",
  "exercitation", "ullamco", "laboris", "nisi", "aliquip", "ex", "ea", "commodo",
  "consequat", "duis", "aute", "irure", "in", "reprehenderit", "voluptate",
  "velit", "esse", "cillum", "fugiat", "nulla", "pariatur", "excepteur", "sint",
  "occaecat", "cupidatat", "non", "proident", "sunt", "culpa", "qui", "officia",
  "deserunt", "mollit", "anim", "id", "est", "laborum", "perspiciatis", "unde",
  "omnis", "iste", "natus", "error", "voluptatem", "accusantium", "doloremque",
  "laudantium", "totam", "rem", "aperiam", "eaque", "ipsa", "quae", "ab", "illo",
  "inventore", "veritatis", "quasi", "architecto", "beatae", "vitae", "dicta",
  "explicabo", "nemo", "ipsam", "quia", "voluptas", "aspernatur", "aut", "odit",
  "fugit", "sed", "quia", "consequuntur", "magni", "dolores", "eos", "ratione",
  "sequi", "nesciunt", "neque", "porro", "quisquam", "qui", "dolorem", "adipisci",
  "numquam", "eius", "modi", "tempora", "incidunt", "magnam", "quam", "aliquam",
  "quaerat", "voluptatem", "corporis", "suscipit", "laboriosam", "exercitationem",
  "ullam", "corporis", "nemo", "enim", "voluptatem", "voluptas", "sit", "aspernatur",
  "aut", "odit", "aut", "fugit", "sed", "quia", "consequuntur", "magni", "dolores",
  "eos", "qui", "ratione", "voluptatem", "sequi", "nesciunt", "neque", "porro",
  "quisquam", "est", "qui", "dolorem", "ipsum", "quia", "dolor", "sit", "amet",
  "consectetur", "adipisci", "velit", "sed", "quia", "non", "numquam", "eius",
  "modi", "tempora", "incidunt", "ut", "labore", "et", "dolore", "magnam", "aliquam",
  "quaerat", "voluptatem", "ut", "enim", "ad", "minima", "veniam", "quis", "nostrum",
  "exercitationem", "ullam", "corporis", "suscipit", "laboriosam", "nisi", "aliquid",
  "ex", "ea", "commodi", "consequatur", "quis", "autem", "vel", "eum", "iure",
  "reprehenderit", "qui", "in", "ea", "voluptate", "velit", "esse", "quam",
  "nihil", "molestiae", "consequatur", "vel", "illum", "qui", "dolorem", "eum",
  "fugiat", "quo", "voluptas", "nulla", "pariatur", "at", "vero", "eos", "et",
  "accusamus", "et", "iusto", "odio", "dignissimos", "ducimus", "qui", "blanditiis",
  "praesentium", "voluptatum", "deleniti", "atque", "corrupti", "quos", "dolores",
  "et", "quas", "molestias", "excepturi", "sint", "occaecati", "cupiditate", "non",
  "provident", "similique", "sunt", "in", "culpa", "qui", "officia", "deserunt",
  "mollitia", "animi", "id", "est", "laborum", "et", "dolorum", "fuga", "et",
  "harum", "quidem", "rerum", "facilis", "est", "et", "expedita", "distinctio",
  "nam", "libero", "tempore", "cum", "soluta", "nobis", "est", "eligendi", "optio",
  "cumque", "nihil", "impedit", "quo", "minus", "id", "quod", "maxime", "placeat",
  "facere", "possimus", "omnis", "voluptas", "assumenda", "est", "omnis", "dolor",
  "repellendus", "temporibus", "autem", "quibusdam", "et", "aut", "officiis",
  "debitis", "aut", "rerum", "necessitatibus", "saepe", "eveniet", "ut", "et",
  "voluptates", "repudiandae", "sint", "et", "molestiae", "non", "recusandae",
  "itaque", "earum", "rerum", "hic", "tenetur", "a", "sapiente", "delectus", "aut",
  "reiciendis", "voluptatibus", "maiores", "alias", "consequatur", "aut", "perferendis",
  "doloribus", "asperiores", "repellat"
];

const LOREM_START = "Lorem ipsum dolor sit amet, consectetur adipiscing elit";

export function LoremIpsumWidget({ widget }: LoremIpsumWidgetProps) {
  // Note: Use getState() for updateWidget to prevent re-render loops

  const config = (widget.config as unknown as LoremIpsumConfig) || {};
  const [generationType, setGenerationType] = useState<GenerationType>(
    config.generationType || "paragraphs"
  );
  const [amount, setAmount] = useState<number>(config.amount || 3);
  const [startWithLorem, setStartWithLorem] = useState<boolean>(
    config.startWithLorem !== undefined ? config.startWithLorem : true
  );
  const [generatedText, setGeneratedText] = useState<string>(
    config.generatedText || ""
  );
  const [isCopying, setIsCopying] = useState(false);

  // Save config when settings change
  useEffect(() => {
    const newConfig: WidgetConfig = {
      generationType,
      paragraphCount: generationType === "paragraphs" ? amount : undefined,
      wordCount: generationType === "words" ? amount : undefined,
      startWithLorem,
    };
    useWidgetStore.getState().updateWidget(widget.id, { config: newConfig });
     
  }, [generationType, amount, startWithLorem, widget.id]);

  // Generate random words
  const getRandomWords = useCallback((count: number): string => {
    const words: string[] = [];
    for (let i = 0; i < count; i++) {
      const randomIndex = Math.floor(Math.random() * LOREM_WORDS.length);
      words.push(LOREM_WORDS[randomIndex]);
    }
    return words.join(" ");
  }, []);

  // Generate a sentence (10-20 words)
  const generateSentence = useCallback((): string => {
    const wordCount = Math.floor(Math.random() * 11) + 10; // 10-20 words
    let sentence = getRandomWords(wordCount);
    // Capitalize first letter
    sentence = sentence.charAt(0).toUpperCase() + sentence.slice(1);
    // Add period
    return sentence + ".";
  }, [getRandomWords]);

  // Generate a paragraph (4-8 sentences)
  const generateParagraph = useCallback((): string => {
    const sentenceCount = Math.floor(Math.random() * 5) + 4; // 4-8 sentences
    const sentences: string[] = [];
    for (let i = 0; i < sentenceCount; i++) {
      sentences.push(generateSentence());
    }
    return sentences.join(" ");
  }, [generateSentence]);

  // Generate Lorem Ipsum text
  const generateText = useCallback(() => {
    let result = "";

    if (generationType === "paragraphs") {
      const paragraphs: string[] = [];

      if (startWithLorem) {
        paragraphs.push(LOREM_START + ". " + generateParagraph());
      }

      const remaining = startWithLorem ? amount - 1 : amount;
      for (let i = 0; i < remaining; i++) {
        paragraphs.push(generateParagraph());
      }

      result = paragraphs.join("\n\n");
    } else if (generationType === "words") {
      if (startWithLorem) {
        const loremWords = LOREM_START.replace(/[.,]/g, "").split(" ");
        const remaining = amount - loremWords.length;
        if (remaining > 0) {
          result = LOREM_START.replace(/[.,]/g, "") + " " + getRandomWords(remaining);
        } else {
          result = loremWords.slice(0, amount).join(" ");
        }
      } else {
        result = getRandomWords(amount);
      }
    } else if (generationType === "sentences") {
      const sentences: string[] = [];

      if (startWithLorem) {
        sentences.push(LOREM_START + ".");
      }

      const remaining = startWithLorem ? amount - 1 : amount;
      for (let i = 0; i < remaining; i++) {
        sentences.push(generateSentence());
      }

      result = sentences.join(" ");
    }

    setGeneratedText(result);
    toast.success("Lorem Ipsum generated");
  }, [generationType, amount, startWithLorem, getRandomWords, generateSentence, generateParagraph]);

  // Copy to clipboard
  const handleCopy = useCallback(async () => {
    if (!generatedText) {
      toast.error("No text to copy");
      return;
    }

    setIsCopying(true);
    try {
      await navigator.clipboard.writeText(generatedText);
      toast.success("Copied to clipboard");
    } catch (error) {
      console.error("Failed to copy:", error);
      toast.error("Failed to copy to clipboard");
    } finally {
      setTimeout(() => setIsCopying(false), 1000);
    }
  }, [generatedText]);

  // Generate initial text if none exists
  useEffect(() => {
    if (!generatedText) {
      generateText();
    }
  }, []); // Run only once on mount

  // Get min/max values based on generation type
  const getAmountConstraints = () => {
    switch (generationType) {
      case "paragraphs":
        return { min: 1, max: 20, step: 1 };
      case "words":
        return { min: 10, max: 1000, step: 10 };
      case "sentences":
        return { min: 1, max: 50, step: 1 };
      default:
        return { min: 1, max: 10, step: 1 };
    }
  };

  const constraints = getAmountConstraints();

  return (
    <div className="@container flex h-full w-full flex-col gap-3 p-4">
      {/* Header */}
      <div className="flex items-center gap-2 shrink-0">
        <FileText className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold">Lorem Ipsum Generator</h3>
      </div>

      {/* Controls */}
      <div className="flex flex-col gap-3 shrink-0">
        {/* Generation Type */}
        <div className="flex flex-col @sm:flex-row gap-2 @sm:items-center">
          <Label htmlFor="generation-type" className="text-xs shrink-0">
            Type:
          </Label>
          <Select
            value={generationType}
            onValueChange={(value) => setGenerationType(value as GenerationType)}
          >
            <SelectTrigger id="generation-type" className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="paragraphs">Paragraphs</SelectItem>
              <SelectItem value="words">Words</SelectItem>
              <SelectItem value="sentences">Sentences</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Amount */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="amount" className="text-xs">
              Amount: {amount}
            </Label>
            <Input
              id="amount-input"
              type="number"
              min={constraints.min}
              max={constraints.max}
              step={constraints.step}
              value={amount}
              onChange={(e) => {
                const value = parseInt(e.target.value, 10);
                if (!isNaN(value)) {
                  setAmount(Math.min(Math.max(value, constraints.min), constraints.max));
                }
              }}
              className="h-7 w-20 text-xs"
            />
          </div>
          <Slider
            id="amount"
            min={constraints.min}
            max={constraints.max}
            step={constraints.step}
            value={[amount]}
            onValueChange={([value]) => setAmount(value)}
            className="w-full"
          />
        </div>

        {/* Start with Lorem */}
        <div className="flex items-center justify-between">
          <Label htmlFor="start-lorem" className="text-xs">
            Start with &ldquo;Lorem ipsum...&rdquo;
          </Label>
          <Switch
            id="start-lorem"
            checked={startWithLorem}
            onCheckedChange={setStartWithLorem}
          />
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button
            onClick={generateText}
            size="sm"
            className="flex-1 h-8 text-xs"
          >
            <RefreshCw className="h-3 w-3 mr-1.5" />
            Generate
          </Button>
          <Button
            onClick={handleCopy}
            size="sm"
            variant="outline"
            disabled={!generatedText || isCopying}
            className="h-8 text-xs"
          >
            <Copy className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Output Area */}
      <div className="flex-1 min-h-0">
        <ScrollArea className="h-full w-full rounded-md border bg-muted/30 p-3">
          {generatedText ? (
            <p className="text-xs leading-relaxed whitespace-pre-wrap text-muted-foreground">
              {generatedText}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground/50 italic">
              Click Generate to create Lorem Ipsum text
            </p>
          )}
        </ScrollArea>
      </div>
    </div>
  );
}
