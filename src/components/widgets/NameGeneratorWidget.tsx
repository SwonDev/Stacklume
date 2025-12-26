"use client";

import { useState, useCallback, useEffect } from "react";
import type { Widget } from "@/types/widget";
import { useWidgetStore } from "@/stores/widget-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { motion, AnimatePresence } from "motion/react";
import {
  Shuffle,
  Copy,
  Star,
  StarOff,
  Plus,
  Trash2,
  Download,
  Settings2,
  Wand2,
  History,
  Check,
  RotateCcw
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NameGeneratorWidgetProps {
  widget: Widget;
}

type NameCategory = "character-male" | "character-female" | "character-neutral" | "place-city" | "place-dungeon" | "place-forest" | "item-weapon" | "item-potion" | "item-artifact" | "creature-monster" | "creature-beast" | "faction";

type StylePreset = "fantasy" | "scifi" | "norse" | "japanese" | "latin" | "lovecraftian";

type NameLength = "short" | "medium" | "long";

interface GeneratedName {
  id: string;
  name: string;
  category: NameCategory;
  style: StylePreset;
  timestamp: number;
  isFavorite: boolean;
}

interface SyllableSet {
  prefixes: string[];
  middles: string[];
  suffixes: string[];
}

interface NameGeneratorConfig {
  nameCategory: NameCategory;
  style: StylePreset;
  length: NameLength;
  count: number;
  seed: string;
  customSyllables: Record<string, SyllableSet>;
  savedNames: GeneratedName[];
  nameHistory: GeneratedName[];
  useCompound: boolean;
  useTitles: boolean;
  [key: string]: unknown;
}

const DEFAULT_CONFIG: NameGeneratorConfig = {
  nameCategory: "character-male",
  style: "fantasy",
  length: "medium",
  count: 5,
  seed: "",
  customSyllables: {},
  savedNames: [],
  nameHistory: [],
  useCompound: false,
  useTitles: false,
};

// Syllable sets for different styles and categories
const SYLLABLE_SETS: Record<StylePreset, Record<string, SyllableSet>> = {
  fantasy: {
    character: {
      prefixes: ["Ar", "Bel", "Cal", "Dor", "El", "Fal", "Gar", "Hal", "Ith", "Jor", "Kal", "Lor", "Mal", "Nor", "Or", "Pel", "Quen", "Ren", "Sar", "Tal", "Ul", "Val", "Wil", "Xan", "Yor", "Zel"],
      middles: ["an", "en", "in", "on", "un", "ar", "er", "ir", "or", "ur", "as", "es", "is", "os", "us"],
      suffixes: ["dor", "wen", "mir", "ril", "dil", "thor", "wyn", "dan", "ren", "del", "ton", "vin", "las", "mon", "tar"]
    },
    place: {
      prefixes: ["Iron", "Silver", "Gold", "Raven", "Dragon", "Eagle", "Shadow", "Storm", "Moon", "Sun", "Star", "Frost", "Fire", "Dark", "Light"],
      middles: ["wood", "vale", "dale", "mount", "crest", "peak", "haven", "bridge", "fall", "mere"],
      suffixes: ["ford", "guard", "keep", "hold", "holm", "ton", "burg", "hall", "spire", "watch"]
    },
    item: {
      prefixes: ["Flame", "Ice", "Storm", "Shadow", "Light", "Dark", "Soul", "Death", "Life", "Blood", "Star", "Moon", "Sun"],
      middles: ["bane", "fury", "song", "seeker", "breaker", "render", "caller", "weaver", "bringer"],
      suffixes: ["blade", "staff", "wand", "bow", "axe", "hammer", "spear", "crown", "ring", "amulet"]
    },
    creature: {
      prefixes: ["Grim", "Dire", "Shade", "Blood", "Bone", "Night", "Death", "Frost", "Fire", "Stone", "Iron", "Dark"],
      middles: ["fang", "claw", "wing", "scale", "horn", "eye", "tail", "maw", "beast"],
      suffixes: ["ling", "spawn", "drake", "wolf", "bear", "serpent", "worm", "fiend", "demon"]
    }
  },
  scifi: {
    character: {
      prefixes: ["Zar", "Kex", "Vex", "Nyx", "Rax", "Tyx", "Qor", "Pax", "Xen", "Zed", "Kyr", "Vox", "Nex", "Rex", "Tex"],
      middles: ["a", "e", "i", "o", "u", "ax", "ex", "ix", "ox", "ux"],
      suffixes: ["ton", "lex", "dex", "rex", "max", "vex", "pex", "tron", "zar", "xor"]
    },
    place: {
      prefixes: ["Neo", "Cyber", "Quantum", "Hyper", "Meta", "Ultra", "Mega", "Nova", "Omega", "Alpha", "Beta", "Gamma"],
      middles: ["tech", "net", "core", "link", "zone", "hub", "port", "dock", "base"],
      suffixes: ["City", "Station", "Colony", "Outpost", "Prime", "Central", "Seven", "Nine", "Zero"]
    },
    item: {
      prefixes: ["Plasma", "Laser", "Photon", "Quantum", "Neural", "Cyber", "Nano", "Hyper", "Meta"],
      middles: ["pulse", "beam", "wave", "field", "core", "link", "matrix"],
      suffixes: ["rifle", "cannon", "blade", "shield", "armor", "module", "device", "array"]
    },
    creature: {
      prefixes: ["Xeno", "Cyb", "Bio", "Mech", "Synth", "Proto", "Holo", "Chrono"],
      middles: ["morph", "drone", "beast", "form", "type", "class", "breed"],
      suffixes: ["ix", "ax", "ox", "ux", "ex", "prime", "alpha", "beta"]
    }
  },
  norse: {
    character: {
      prefixes: ["Arn", "Bjor", "Dag", "Egil", "Finn", "Gar", "Hal", "Ing", "Kjar", "Leif", "Olf", "Rag", "Sig", "Thor", "Ulf", "Vor"],
      middles: ["ar", "er", "ir", "or", "ur", "an", "en", "in", "on"],
      suffixes: ["nar", "ulf", "vald", "mund", "mar", "rik", "dor", "grim", "björn", "sson", "sen"]
    },
    place: {
      prefixes: ["Asg", "Mid", "Hel", "Val", "Alf", "Svar", "Mus", "Jot"],
      middles: ["gard", "heim", "halla", "fjord", "berg", "dal", "vik"],
      suffixes: ["garde", "heimr", "land", "strand", "havn", "borg"]
    },
    item: {
      prefixes: ["Mjol", "Gun", "Drag", "Gram", "Tyr", "Odin", "Thor"],
      middles: ["fang", "bane", "ruin", "doom", "fury"],
      suffixes: ["nir", "gnir", "fimbul", "hring", "brynja"]
    },
    creature: {
      prefixes: ["Fen", "Jor", "Nid", "Dra", "Lind", "Hug", "Mun"],
      middles: ["ris", "jotunn", "varg", "orm"],
      suffixes: ["rir", "mundr", "gandr", "ulfr"]
    }
  },
  japanese: {
    character: {
      prefixes: ["Aka", "Ao", "Hi", "Ka", "Ki", "Mi", "Na", "Ren", "Ryu", "Sa", "Shi", "Ta", "Yu", "Zen"],
      middles: ["ka", "ki", "ko", "mi", "na", "no", "ri", "ro", "ru", "shi", "to"],
      suffixes: ["ko", "ka", "mi", "ri", "ro", "to", "ya", "ma", "ra", "ta", "chi", "ji"]
    },
    place: {
      prefixes: ["Kyo", "Osa", "Edo", "Naga", "Hiro", "Yoko", "Kuma", "Fuku"],
      middles: ["to", "sa", "ka", "shi", "no", "ha", "ma"],
      suffixes: ["hama", "yama", "kawa", "machi", "mura", "shima", "jima"]
    },
    item: {
      prefixes: ["Kusa", "Kata", "Mura", "Tachi", "Yumi", "Yari"],
      middles: ["nagi", "masa", "mune", "sada", "yoshi"],
      suffixes: ["maru", "zukuri", "gane", "mono"]
    },
    creature: {
      prefixes: ["Kami", "Oni", "Kitsune", "Tengu", "Ryu", "Kappa"],
      middles: ["no", "ga", "wa"],
      suffixes: ["maru", "gami", "mono"]
    }
  },
  latin: {
    character: {
      prefixes: ["Aur", "Cae", "Jul", "Mar", "Max", "Oct", "Pub", "Ser", "Tib", "Val", "Vir"],
      middles: ["e", "i", "a", "o", "u", "el", "il", "ol", "ul"],
      suffixes: ["ius", "us", "icus", "anus", "inus", "ensis", "alis", "aris"]
    },
    place: {
      prefixes: ["Rom", "Aquil", "Aug", "Caes", "Col", "Flor", "Med", "Nap"],
      middles: ["oli", "opi", "ari", "ori"],
      suffixes: ["ia", "um", "opolis", "ium", "ensis", "aria"]
    },
    item: {
      prefixes: ["Glad", "Pil", "Scip", "Scut", "Pug", "Spat"],
      middles: ["i", "o", "a"],
      suffixes: ["us", "um", "ium", "aris", "ensis"]
    },
    creature: {
      prefixes: ["Drac", "Grif", "Hydr", "Minotaur", "Cycl", "Chimaer"],
      middles: ["on", "in", "an"],
      suffixes: ["us", "a", "um", "ops"]
    }
  },
  lovecraftian: {
    character: {
      prefixes: ["Azath", "Cthul", "Dag", "Ghoul", "Hastur", "Nyar", "Shub", "Tsath", "Yig", "Zoth"],
      middles: ["oth", "oth", "agh", "ogg", "ugg", "agg"],
      suffixes: ["oth", "ua", "otha", "iggurath", "aoth", "oggua"]
    },
    place: {
      prefixes: ["R'ly", "Kad", "Irl", "Leng", "Yh", "Cel", "Dylath"],
      middles: ["eh", "ah", "oth"],
      suffixes: ["eh", "oth", "ar", "ath", "leen", "nphet"]
    },
    item: {
      prefixes: ["Elder", "Outer", "Ancient", "Mad", "Eldritch", "Void"],
      middles: ["sign", "tome", "stone", "key", "seal"],
      suffixes: ["onomicon", "oth", "ath", "ara"]
    },
    creature: {
      prefixes: ["Shogg", "Deep", "Night", "Byakh", "Dhole", "Ghast"],
      middles: ["oth", "gug", "gaunt"],
      suffixes: ["oth", "ling", "spawn", "thing"]
    }
  }
};

// Title templates
const TITLE_TEMPLATES = [
  "The [adjective] [noun]",
  "The [noun] of [noun]",
  "[adjective] [name]",
  "[name] the [adjective]",
  "[name], [adjective] [noun]",
];

const ADJECTIVES = [
  "Ancient", "Blazing", "Cursed", "Dark", "Eternal", "Fallen", "Grim", "Hidden",
  "Immortal", "Just", "Keen", "Lost", "Mighty", "Noble", "Ominous", "Proud",
  "Quick", "Radiant", "Silent", "Terrible", "Unbroken", "Vengeful", "Wild",
  "Xenial", "Young", "Zealous"
];

const NOUNS = [
  "Archer", "Blade", "Champion", "Destroyer", "Emperor", "Flame", "Guardian",
  "Hunter", "Iron", "Judge", "King", "Lord", "Master", "Night", "Oracle",
  "Prince", "Queen", "Ranger", "Shadow", "Titan", "Umber", "Vanguard",
  "Warrior", "Xenith", "Youth", "Zealot"
];

export function NameGeneratorWidget({ widget }: NameGeneratorWidgetProps) {
  const { updateWidget } = useWidgetStore();

  const config: NameGeneratorConfig = {
    ...DEFAULT_CONFIG,
    ...(widget.config as Partial<NameGeneratorConfig>),
  };

  const [currentNames, setCurrentNames] = useState<string[]>([]);
  const [copied, setCopied] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [customDialogOpen, setCustomDialogOpen] = useState(false);
  const [_customSyllables, _setCustomSyllables] = useState<SyllableSet>({
    prefixes: [],
    middles: [],
    suffixes: [],
  });
  const [customInput, setCustomInput] = useState({
    prefixes: "",
    middles: "",
    suffixes: "",
  });

  const updateConfig = useCallback(
    (updates: Partial<NameGeneratorConfig>) => {
      updateWidget(widget.id, {
        config: { ...config, ...updates } as unknown as typeof widget.config
      });
    },
    [config, updateWidget, widget.id]
  );

  // Seeded random number generator for reproducible results
  const seededRandom = useCallback((seed: string) => {
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      hash = ((hash << 5) - hash) + seed.charCodeAt(i);
      hash = hash & hash;
    }

    return () => {
      hash = (hash * 9301 + 49297) % 233280;
      return hash / 233280;
    };
  }, []);

  const getCategoryType = useCallback((category: NameCategory): string => {
    if (category.startsWith("character")) return "character";
    if (category.startsWith("place")) return "place";
    if (category.startsWith("item")) return "item";
    if (category.startsWith("creature")) return "creature";
    return "character";
  }, []);

  const generateSingleName = useCallback((
    style: StylePreset,
    category: NameCategory,
    length: NameLength,
    seed?: string
  ): string => {
    const categoryType = getCategoryType(category);
    const syllables = SYLLABLE_SETS[style][categoryType] || SYLLABLE_SETS.fantasy.character;

    const random = seed ? seededRandom(seed + Date.now().toString()) : Math.random;
    const getRandom = typeof random === 'function' ? random : () => Math.random();

    const { prefixes, middles, suffixes } = syllables;

    const parts: string[] = [];

    // Determine number of parts based on length
    const partCount = length === "short" ? 2 : length === "medium" ? 3 : 4;

    // Always start with a prefix
    parts.push(prefixes[Math.floor(getRandom() * prefixes.length)]);

    // Add middle parts
    for (let i = 1; i < partCount - 1; i++) {
      parts.push(middles[Math.floor(getRandom() * middles.length)]);
    }

    // Always end with a suffix
    parts.push(suffixes[Math.floor(getRandom() * suffixes.length)]);

    return parts.join("");
  }, [getCategoryType, seededRandom]);

  const generateTitle = useCallback((baseName: string): string => {
    const template = TITLE_TEMPLATES[Math.floor(Math.random() * TITLE_TEMPLATES.length)];
    const adjective = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
    const _noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];

    return template
      .replace("[name]", baseName)
      .replace("[adjective]", adjective)
      .replace(/\[noun\]/g, NOUNS[Math.floor(Math.random() * NOUNS.length)]);
  }, []);

  const generateCompoundName = useCallback((
    style: StylePreset,
    category: NameCategory,
    length: NameLength,
    seed?: string
  ): string => {
    const firstName = generateSingleName(style, category, length, seed);
    const lastName = generateSingleName(style, category, length, seed ? seed + "1" : undefined);
    return `${firstName} ${lastName}`;
  }, [generateSingleName]);

  const generateNames = useCallback(() => {
    const names: string[] = [];
    const { style, nameCategory: category, length, count, seed, useCompound, useTitles } = config;

    for (let i = 0; i < count; i++) {
      const seedStr = seed ? `${seed}-${i}` : undefined;
      let name: string;

      if (useCompound) {
        name = generateCompoundName(style, category, length, seedStr);
      } else {
        name = generateSingleName(style, category, length, seedStr);
      }

      if (useTitles) {
        name = generateTitle(name);
      }

      names.push(name);
    }

    setCurrentNames(names);

    // Add to history
    const historyItems: GeneratedName[] = names.map((name) => ({
      id: `${Date.now()}-${Math.random()}`,
      name,
      category,
      style,
      timestamp: Date.now(),
      isFavorite: false,
    }));

    updateConfig({
      nameHistory: [...historyItems, ...(config.nameHistory || [])].slice(0, 50),
    });

    toast.success(`Generated ${count} ${count === 1 ? 'name' : 'names'}`);
  }, [config, generateSingleName, generateCompoundName, generateTitle, updateConfig]);

  const copyToClipboard = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(text);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopied(null), 2000);
    } catch (_error) {
      toast.error("Failed to copy");
    }
  }, []);

  const copyAllNames = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(currentNames.join("\n"));
      toast.success("All names copied");
    } catch (_error) {
      toast.error("Failed to copy");
    }
  }, [currentNames]);

  const toggleFavorite = useCallback((name: string) => {
    const existing = config.savedNames?.find(f => f.name === name);

    if (existing) {
      updateConfig({
        savedNames: config.savedNames?.filter(f => f.name !== name) || [],
      });
      toast.success("Removed from favorites");
    } else {
      const newFavorite: GeneratedName = {
        id: `${Date.now()}-${Math.random()}`,
        name,
        category: config.nameCategory,
        style: config.style,
        timestamp: Date.now(),
        isFavorite: true,
      };
      updateConfig({
        savedNames: [...(config.savedNames || []), newFavorite],
      });
      toast.success("Added to favorites");
    }
  }, [config, updateConfig]);

  const isFavorite = useCallback((name: string): boolean => {
    return config.savedNames?.some(f => f.name === name) || false;
  }, [config.savedNames]);

  const exportNames = useCallback((format: 'json' | 'text') => {
    const names = config.savedNames || [];

    if (names.length === 0) {
      toast.error("No favorites to export");
      return;
    }

    let content: string;
    let filename: string;

    if (format === 'json') {
      content = JSON.stringify(names, null, 2);
      filename = `names-${Date.now()}.json`;
    } else {
      content = names.map(n => n.name).join("\n");
      filename = `names-${Date.now()}.txt`;
    }

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);

    toast.success(`Exported ${names.length} names`);
  }, [config.savedNames]);

  const saveCustomSyllables = useCallback(() => {
    const prefixes = customInput.prefixes.split(',').map(s => s.trim()).filter(Boolean);
    const middles = customInput.middles.split(',').map(s => s.trim()).filter(Boolean);
    const suffixes = customInput.suffixes.split(',').map(s => s.trim()).filter(Boolean);

    if (prefixes.length === 0 || middles.length === 0 || suffixes.length === 0) {
      toast.error("All syllable types must have at least one entry");
      return;
    }

    const key = `custom-${Date.now()}`;
    updateConfig({
      customSyllables: {
        ...config.customSyllables,
        [key]: { prefixes, middles, suffixes },
      },
    });

    setCustomDialogOpen(false);
    toast.success("Custom syllables saved");
  }, [customInput, config.customSyllables, updateConfig]);

  // Generate initial names on mount
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      if (currentNames.length === 0) {
        generateNames();
      }
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <div className="@container size-full">
      <div className="flex size-full flex-col gap-3 @xs:gap-4 p-3 @xs:p-4">
        {/* Header */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Wand2 className="size-4 @xs:size-5 text-primary" />
            <h3 className="text-sm @xs:text-base font-semibold">Name Generator</h3>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 @xs:h-8 px-2"
              onClick={() => setShowHistory(!showHistory)}
            >
              <History className="size-3 @xs:size-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 @xs:h-8 px-2"
              onClick={() => setShowSettings(!showSettings)}
            >
              <Settings2 className="size-3 @xs:size-4" />
            </Button>
          </div>
        </div>

        <div className="flex-1 flex flex-col gap-3 @xs:gap-4 min-h-0">
          {!showHistory ? (
            <>
              {/* Settings Panel */}
              <AnimatePresence>
                {showSettings && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="space-y-3 overflow-hidden"
                  >
                    <div className="grid grid-cols-1 @sm:grid-cols-2 gap-2 @xs:gap-3">
                      {/* Category */}
                      <div className="space-y-1.5">
                        <Label className="text-xs @xs:text-sm">Category</Label>
                        <Select
                          value={config.nameCategory}
                          onValueChange={(value: NameCategory) => updateConfig({ nameCategory: value })}
                        >
                          <SelectTrigger className="h-8 @xs:h-9 text-xs @xs:text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="character-male">Character (Male)</SelectItem>
                            <SelectItem value="character-female">Character (Female)</SelectItem>
                            <SelectItem value="character-neutral">Character (Neutral)</SelectItem>
                            <SelectItem value="place-city">Place (City)</SelectItem>
                            <SelectItem value="place-dungeon">Place (Dungeon)</SelectItem>
                            <SelectItem value="place-forest">Place (Forest)</SelectItem>
                            <SelectItem value="item-weapon">Item (Weapon)</SelectItem>
                            <SelectItem value="item-potion">Item (Potion)</SelectItem>
                            <SelectItem value="item-artifact">Item (Artifact)</SelectItem>
                            <SelectItem value="creature-monster">Creature (Monster)</SelectItem>
                            <SelectItem value="creature-beast">Creature (Beast)</SelectItem>
                            <SelectItem value="faction">Faction/Guild</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Style */}
                      <div className="space-y-1.5">
                        <Label className="text-xs @xs:text-sm">Style</Label>
                        <Select
                          value={config.style}
                          onValueChange={(value: StylePreset) => updateConfig({ style: value })}
                        >
                          <SelectTrigger className="h-8 @xs:h-9 text-xs @xs:text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="fantasy">Fantasy</SelectItem>
                            <SelectItem value="scifi">Sci-fi</SelectItem>
                            <SelectItem value="norse">Norse</SelectItem>
                            <SelectItem value="japanese">Japanese</SelectItem>
                            <SelectItem value="latin">Latin</SelectItem>
                            <SelectItem value="lovecraftian">Lovecraftian</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Length */}
                      <div className="space-y-1.5">
                        <Label className="text-xs @xs:text-sm">Length</Label>
                        <Select
                          value={config.length}
                          onValueChange={(value: NameLength) => updateConfig({ length: value })}
                        >
                          <SelectTrigger className="h-8 @xs:h-9 text-xs @xs:text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="short">Short (2 parts)</SelectItem>
                            <SelectItem value="medium">Medium (3 parts)</SelectItem>
                            <SelectItem value="long">Long (4 parts)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Count */}
                      <div className="space-y-1.5">
                        <Label className="text-xs @xs:text-sm">Generate Count</Label>
                        <Select
                          value={config.count.toString()}
                          onValueChange={(value) => updateConfig({ count: parseInt(value) })}
                        >
                          <SelectTrigger className="h-8 @xs:h-9 text-xs @xs:text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="5">5 names</SelectItem>
                            <SelectItem value="10">10 names</SelectItem>
                            <SelectItem value="20">20 names</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Seed Input */}
                    <div className="space-y-1.5">
                      <Label className="text-xs @xs:text-sm">Seed (optional - for reproducible names)</Label>
                      <div className="flex gap-2">
                        <Input
                          value={config.seed}
                          onChange={(e) => updateConfig({ seed: e.target.value })}
                          placeholder="Enter seed value..."
                          className="h-8 @xs:h-9 text-xs @xs:text-sm"
                        />
                        {config.seed && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 @xs:h-9 px-2"
                            onClick={() => updateConfig({ seed: "" })}
                          >
                            <RotateCcw className="size-3 @xs:size-4" />
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Options */}
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant={config.useCompound ? "default" : "outline"}
                        size="sm"
                        className="h-7 @xs:h-8 text-xs"
                        onClick={() => updateConfig({ useCompound: !config.useCompound })}
                      >
                        Compound Names
                      </Button>
                      <Button
                        variant={config.useTitles ? "default" : "outline"}
                        size="sm"
                        className="h-7 @xs:h-8 text-xs"
                        onClick={() => updateConfig({ useTitles: !config.useTitles })}
                      >
                        Add Titles
                      </Button>
                      <Dialog open={customDialogOpen} onOpenChange={setCustomDialogOpen}>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm" className="h-7 @xs:h-8 text-xs">
                            <Plus className="size-3 mr-1" />
                            Custom Syllables
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Add Custom Syllables</DialogTitle>
                            <DialogDescription>
                              Add comma-separated syllables for each position
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-3">
                            <div className="space-y-1.5">
                              <Label>Prefixes</Label>
                              <Input
                                value={customInput.prefixes}
                                onChange={(e) => setCustomInput({ ...customInput, prefixes: e.target.value })}
                                placeholder="Ar, Bel, Cal, Dor..."
                              />
                            </div>
                            <div className="space-y-1.5">
                              <Label>Middles</Label>
                              <Input
                                value={customInput.middles}
                                onChange={(e) => setCustomInput({ ...customInput, middles: e.target.value })}
                                placeholder="an, en, in, on..."
                              />
                            </div>
                            <div className="space-y-1.5">
                              <Label>Suffixes</Label>
                              <Input
                                value={customInput.suffixes}
                                onChange={(e) => setCustomInput({ ...customInput, suffixes: e.target.value })}
                                placeholder="dor, wen, mir, ril..."
                              />
                            </div>
                            <Button onClick={saveCustomSyllables} className="w-full">
                              Save Syllables
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Generate Button */}
              <Button
                onClick={generateNames}
                className="w-full h-9 @xs:h-10 @md:h-11"
                size="lg"
              >
                <Shuffle className="size-4 mr-2" />
                Generate Names
              </Button>

              {/* Generated Names */}
              <div className="flex-1 min-h-0 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs @xs:text-sm font-medium text-muted-foreground">
                    Generated Names ({currentNames.length})
                  </h4>
                  {currentNames.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 @xs:h-7 px-2 text-xs"
                      onClick={copyAllNames}
                    >
                      <Copy className="size-3 mr-1" />
                      Copy All
                    </Button>
                  )}
                </div>

                <ScrollArea className="h-full">
                  <AnimatePresence mode="popLayout">
                    {currentNames.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full text-center p-4">
                        <Wand2 className="size-8 @xs:size-10 text-muted-foreground/50 mb-2" />
                        <p className="text-xs @xs:text-sm text-muted-foreground">
                          Click Generate to create names
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-1.5 pb-2">
                        {currentNames.map((name, index) => (
                          <motion.div
                            key={`${name}-${index}`}
                            layout
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.8, opacity: 0 }}
                            transition={{ delay: index * 0.03 }}
                            className="group flex items-center gap-2 p-2 @xs:p-3 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors"
                          >
                            <span className="flex-1 text-sm @xs:text-base font-medium">
                              {name}
                            </span>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 @xs:h-7 w-6 @xs:w-7 p-0"
                                onClick={() => copyToClipboard(name)}
                              >
                                {copied === name ? (
                                  <Check className="size-3 text-green-500" />
                                ) : (
                                  <Copy className="size-3" />
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 @xs:h-7 w-6 @xs:w-7 p-0"
                                onClick={() => toggleFavorite(name)}
                              >
                                {isFavorite(name) ? (
                                  <Star className="size-3 fill-yellow-500 text-yellow-500" />
                                ) : (
                                  <StarOff className="size-3" />
                                )}
                              </Button>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </AnimatePresence>
                </ScrollArea>
              </div>
            </>
          ) : (
            /* History/Favorites View */
            <Tabs defaultValue="favorites" className="flex-1 flex flex-col min-h-0">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="favorites" className="text-xs @xs:text-sm">
                  Favorites ({config.savedNames?.length || 0})
                </TabsTrigger>
                <TabsTrigger value="history" className="text-xs @xs:text-sm">
                  History ({config.nameHistory?.length || 0})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="favorites" className="flex-1 min-h-0 space-y-2 mt-3">
                {(config.savedNames?.length || 0) > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      {config.savedNames?.length} saved
                    </span>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 @xs:h-7 px-2 text-xs"
                        onClick={() => exportNames('json')}
                      >
                        <Download className="size-3 mr-1" />
                        JSON
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 @xs:h-7 px-2 text-xs"
                        onClick={() => exportNames('text')}
                      >
                        <Download className="size-3 mr-1" />
                        TXT
                      </Button>
                    </div>
                  </div>
                )}

                <ScrollArea className="h-full">
                  {(config.savedNames?.length || 0) === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center p-4">
                      <Star className="size-8 @xs:size-10 text-muted-foreground/50 mb-2" />
                      <p className="text-xs @xs:text-sm text-muted-foreground">
                        No favorites yet
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-1.5 pb-2">
                      {config.savedNames?.map((item) => (
                        <div
                          key={item.id}
                          className="group flex items-center gap-2 p-2 @xs:p-3 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="text-sm @xs:text-base font-medium truncate">
                              {item.name}
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="secondary" className="text-[9px] @xs:text-[10px] px-1.5 py-0">
                                {item.style}
                              </Badge>
                              <span className="text-[9px] @xs:text-[10px] text-muted-foreground">
                                {new Date(item.timestamp).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 @xs:h-7 w-6 @xs:w-7 p-0"
                              onClick={() => copyToClipboard(item.name)}
                            >
                              <Copy className="size-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 @xs:h-7 w-6 @xs:w-7 p-0"
                              onClick={() => toggleFavorite(item.name)}
                            >
                              <Trash2 className="size-3 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>

              <TabsContent value="history" className="flex-1 min-h-0 mt-3">
                <ScrollArea className="h-full">
                  {(config.nameHistory?.length || 0) === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center p-4">
                      <History className="size-8 @xs:size-10 text-muted-foreground/50 mb-2" />
                      <p className="text-xs @xs:text-sm text-muted-foreground">
                        No history yet
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-1.5 pb-2">
                      {config.nameHistory?.map((item, index) => (
                        <div
                          key={item.id}
                          className={cn(
                            "group flex items-center gap-2 p-2 @xs:p-3 rounded-lg border transition-colors",
                            index < 5 ? "bg-muted/50" : "bg-muted/20"
                          )}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="text-xs @xs:text-sm font-medium truncate">
                              {item.name}
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="secondary" className="text-[9px] @xs:text-[10px] px-1.5 py-0">
                                {item.style}
                              </Badge>
                              <span className="text-[9px] @xs:text-[10px] text-muted-foreground">
                                {new Date(item.timestamp).toLocaleTimeString()}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 @xs:h-7 w-6 @xs:w-7 p-0"
                              onClick={() => copyToClipboard(item.name)}
                            >
                              <Copy className="size-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 @xs:h-7 w-6 @xs:w-7 p-0"
                              onClick={() => toggleFavorite(item.name)}
                            >
                              {isFavorite(item.name) ? (
                                <Star className="size-3 fill-yellow-500 text-yellow-500" />
                              ) : (
                                <StarOff className="size-3" />
                              )}
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>
            </Tabs>
          )}
        </div>
      </div>
    </div>
  );
}
