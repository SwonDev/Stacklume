"use client";

import { useState, useEffect } from "react";
import {
  Palette,
  Type,
  Ruler,
  Box,
  Circle,
  Download,
  Plus,
  Trash2,
  Edit2,
} from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useWidgetStore } from "@/stores/widget-store";
import type { Widget } from "@/types/widget";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";

interface DesignTokensWidgetProps {
  widget: Widget;
}

type ColorCategory = "primary" | "secondary" | "neutral" | "semantic" | "custom";

interface ColorToken {
  id: string;
  name: string;
  value: string;
  category: ColorCategory;
}

interface TypographyToken {
  id: string;
  name: string;
  fontFamily: string;
  fontSize: string;
  fontWeight: string;
  lineHeight: string;
}

interface SpacingToken {
  id: string;
  name: string;
  value: string;
  unit: "px" | "rem";
}

interface ShadowToken {
  id: string;
  name: string;
  value: string;
}

interface RadiusToken {
  id: string;
  name: string;
  value: string;
}

interface DesignTokensConfig {
  colors?: ColorToken[];
  typography?: TypographyToken[];
  spacing?: SpacingToken[];
  shadows?: ShadowToken[];
  radii?: RadiusToken[];
}

type ExportFormat = "css" | "scss" | "json" | "tailwind";
type TokenCategory = "colors" | "typography" | "spacing" | "shadows" | "radii";

const FONT_FAMILIES = [
  "Inter",
  "Roboto",
  "Open Sans",
  "Poppins",
  "Montserrat",
  "Lato",
  "system-ui",
  "monospace",
];

const FONT_WEIGHTS = ["300", "400", "500", "600", "700", "800", "900"];

export function DesignTokensWidget({ widget: initialWidget }: DesignTokensWidgetProps) {
  const updateWidget = useWidgetStore((state) => state.updateWidget);
  const storeWidget = useWidgetStore(
    (state) => state.widgets.find((w) => w.id === initialWidget.id)
  );

  const widget = storeWidget || initialWidget;
  const config = (widget.config as unknown as DesignTokensConfig) || {};

  const [colors, setColors] = useState<ColorToken[]>(config.colors || []);
  const [typography, setTypography] = useState<TypographyToken[]>(config.typography || []);
  const [spacing, setSpacing] = useState<SpacingToken[]>(config.spacing || []);
  const [shadows, setShadows] = useState<ShadowToken[]>(config.shadows || []);
  const [radii, setRadii] = useState<RadiusToken[]>(config.radii || []);

  const [activeTab, setActiveTab] = useState<TokenCategory>("colors");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingToken, setEditingToken] = useState<ColorToken | TypographyToken | SpacingToken | ShadowToken | RadiusToken | null>(null);
  const [_copiedValue, setCopiedValue] = useState<string | null>(null);

  // Form states for adding/editing tokens
  const [formColorName, setFormColorName] = useState("");
  const [formColorValue, setFormColorValue] = useState("#3B82F6");
  const [formColorCategory, setFormColorCategory] = useState<ColorCategory>("primary");

  const [formTypoName, setFormTypoName] = useState("");
  const [formTypoFamily, setFormTypoFamily] = useState("Inter");
  const [formTypoSize, setFormTypoSize] = useState("16px");
  const [formTypoWeight, setFormTypoWeight] = useState("400");
  const [formTypoLineHeight, setFormTypoLineHeight] = useState("1.5");

  const [formSpacingName, setFormSpacingName] = useState("");
  const [formSpacingValue, setFormSpacingValue] = useState("16");
  const [formSpacingUnit, setFormSpacingUnit] = useState<"px" | "rem">("px");

  const [formShadowName, setFormShadowName] = useState("");
  const [formShadowValue, setFormShadowValue] = useState("0 2px 4px rgba(0,0,0,0.1)");

  const [formRadiusName, setFormRadiusName] = useState("");
  const [formRadiusValue, setFormRadiusValue] = useState("8px");

  // Update config when tokens change
  useEffect(() => {
    updateWidget(widget.id, {
      config: {
        ...widget.config,
        colors,
        typography,
        spacing,
        shadows,
        radii,
      } as unknown as typeof widget.config,
    });
  }, [colors, typography, spacing, shadows, radii, widget.id]);

  const resetForm = () => {
    setFormColorName("");
    setFormColorValue("#3B82F6");
    setFormColorCategory("primary");
    setFormTypoName("");
    setFormTypoFamily("Inter");
    setFormTypoSize("16px");
    setFormTypoWeight("400");
    setFormTypoLineHeight("1.5");
    setFormSpacingName("");
    setFormSpacingValue("16");
    setFormSpacingUnit("px");
    setFormShadowName("");
    setFormShadowValue("0 2px 4px rgba(0,0,0,0.1)");
    setFormRadiusName("");
    setFormRadiusValue("8px");
    setEditingToken(null);
  };

  const handleOpenAddDialog = () => {
    resetForm();
    setIsAddDialogOpen(true);
  };

  const handleOpenEditDialog = (token: ColorToken | TypographyToken | SpacingToken | ShadowToken | RadiusToken) => {
    setEditingToken(token);

    if (activeTab === "colors" && "category" in token) {
      const colorToken = token as ColorToken;
      setFormColorName(colorToken.name);
      setFormColorValue(colorToken.value);
      setFormColorCategory(colorToken.category);
    } else if (activeTab === "typography" && "fontFamily" in token) {
      const typoToken = token as TypographyToken;
      setFormTypoName(typoToken.name);
      setFormTypoFamily(typoToken.fontFamily);
      setFormTypoSize(typoToken.fontSize);
      setFormTypoWeight(typoToken.fontWeight);
      setFormTypoLineHeight(typoToken.lineHeight);
    } else if (activeTab === "spacing" && "unit" in token) {
      const spacingToken = token as SpacingToken;
      setFormSpacingName(spacingToken.name);
      const match = spacingToken.value.match(/(\d+(?:\.\d+)?)(px|rem)/);
      if (match) {
        setFormSpacingValue(match[1]);
        setFormSpacingUnit(match[2] as "px" | "rem");
      }
    } else if (activeTab === "shadows" && !("category" in token) && !("fontFamily" in token) && !("unit" in token)) {
      const shadowToken = token as ShadowToken;
      setFormShadowName(shadowToken.name);
      setFormShadowValue(shadowToken.value);
    } else if (activeTab === "radii") {
      const radiusToken = token as RadiusToken;
      setFormRadiusName(radiusToken.name);
      setFormRadiusValue(radiusToken.value);
    }

    setIsEditDialogOpen(true);
  };

  const handleAddToken = () => {
    if (activeTab === "colors") {
      if (!formColorName.trim()) {
        toast.error("Color name is required");
        return;
      }
      const newToken: ColorToken = {
        id: Date.now().toString(),
        name: formColorName.trim(),
        value: formColorValue,
        category: formColorCategory,
      };
      setColors([...colors, newToken]);
      toast.success("Color token added");
    } else if (activeTab === "typography") {
      if (!formTypoName.trim()) {
        toast.error("Typography name is required");
        return;
      }
      const newToken: TypographyToken = {
        id: Date.now().toString(),
        name: formTypoName.trim(),
        fontFamily: formTypoFamily,
        fontSize: formTypoSize,
        fontWeight: formTypoWeight,
        lineHeight: formTypoLineHeight,
      };
      setTypography([...typography, newToken]);
      toast.success("Typography token added");
    } else if (activeTab === "spacing") {
      if (!formSpacingName.trim()) {
        toast.error("Spacing name is required");
        return;
      }
      const newToken: SpacingToken = {
        id: Date.now().toString(),
        name: formSpacingName.trim(),
        value: `${formSpacingValue}${formSpacingUnit}`,
        unit: formSpacingUnit,
      };
      setSpacing([...spacing, newToken]);
      toast.success("Spacing token added");
    } else if (activeTab === "shadows") {
      if (!formShadowName.trim()) {
        toast.error("Shadow name is required");
        return;
      }
      const newToken: ShadowToken = {
        id: Date.now().toString(),
        name: formShadowName.trim(),
        value: formShadowValue,
      };
      setShadows([...shadows, newToken]);
      toast.success("Shadow token added");
    } else if (activeTab === "radii") {
      if (!formRadiusName.trim()) {
        toast.error("Radius name is required");
        return;
      }
      const newToken: RadiusToken = {
        id: Date.now().toString(),
        name: formRadiusName.trim(),
        value: formRadiusValue,
      };
      setRadii([...radii, newToken]);
      toast.success("Radius token added");
    }

    setIsAddDialogOpen(false);
    resetForm();
  };

  const handleEditToken = () => {
    if (!editingToken) return;

    if (activeTab === "colors") {
      setColors(
        colors.map((token) =>
          token.id === editingToken.id
            ? {
                ...token,
                name: formColorName.trim(),
                value: formColorValue,
                category: formColorCategory,
              }
            : token
        )
      );
      toast.success("Color token updated");
    } else if (activeTab === "typography") {
      setTypography(
        typography.map((token) =>
          token.id === editingToken.id
            ? {
                ...token,
                name: formTypoName.trim(),
                fontFamily: formTypoFamily,
                fontSize: formTypoSize,
                fontWeight: formTypoWeight,
                lineHeight: formTypoLineHeight,
              }
            : token
        )
      );
      toast.success("Typography token updated");
    } else if (activeTab === "spacing") {
      setSpacing(
        spacing.map((token) =>
          token.id === editingToken.id
            ? {
                ...token,
                name: formSpacingName.trim(),
                value: `${formSpacingValue}${formSpacingUnit}`,
                unit: formSpacingUnit,
              }
            : token
        )
      );
      toast.success("Spacing token updated");
    } else if (activeTab === "shadows") {
      setShadows(
        shadows.map((token) =>
          token.id === editingToken.id
            ? {
                ...token,
                name: formShadowName.trim(),
                value: formShadowValue,
              }
            : token
        )
      );
      toast.success("Shadow token updated");
    } else if (activeTab === "radii") {
      setRadii(
        radii.map((token) =>
          token.id === editingToken.id
            ? {
                ...token,
                name: formRadiusName.trim(),
                value: formRadiusValue,
              }
            : token
        )
      );
      toast.success("Radius token updated");
    }

    setIsEditDialogOpen(false);
    resetForm();
  };

  const handleDeleteToken = (id: string) => {
    if (activeTab === "colors") {
      setColors(colors.filter((token) => token.id !== id));
    } else if (activeTab === "typography") {
      setTypography(typography.filter((token) => token.id !== id));
    } else if (activeTab === "spacing") {
      setSpacing(spacing.filter((token) => token.id !== id));
    } else if (activeTab === "shadows") {
      setShadows(shadows.filter((token) => token.id !== id));
    } else if (activeTab === "radii") {
      setRadii(radii.filter((token) => token.id !== id));
    }
    toast.success("Token deleted");
  };

  const copyToClipboard = async (text: string, label: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedValue(text);
    toast.success("Copied to clipboard", {
      description: label,
      duration: 1500,
    });
    setTimeout(() => setCopiedValue(null), 2000);
  };

  const exportTokens = (format: ExportFormat) => {
    let output = "";

    if (format === "css") {
      output = ":root {\n";

      colors.forEach((token) => {
        output += `  --color-${token.name}: ${token.value};\n`;
      });

      typography.forEach((token) => {
        output += `  --font-${token.name}-family: ${token.fontFamily};\n`;
        output += `  --font-${token.name}-size: ${token.fontSize};\n`;
        output += `  --font-${token.name}-weight: ${token.fontWeight};\n`;
        output += `  --font-${token.name}-line-height: ${token.lineHeight};\n`;
      });

      spacing.forEach((token) => {
        output += `  --spacing-${token.name}: ${token.value};\n`;
      });

      shadows.forEach((token) => {
        output += `  --shadow-${token.name}: ${token.value};\n`;
      });

      radii.forEach((token) => {
        output += `  --radius-${token.name}: ${token.value};\n`;
      });

      output += "}";
    } else if (format === "scss") {
      colors.forEach((token) => {
        output += `$color-${token.name}: ${token.value};\n`;
      });

      typography.forEach((token) => {
        output += `$font-${token.name}-family: ${token.fontFamily};\n`;
        output += `$font-${token.name}-size: ${token.fontSize};\n`;
        output += `$font-${token.name}-weight: ${token.fontWeight};\n`;
        output += `$font-${token.name}-line-height: ${token.lineHeight};\n`;
      });

      spacing.forEach((token) => {
        output += `$spacing-${token.name}: ${token.value};\n`;
      });

      shadows.forEach((token) => {
        output += `$shadow-${token.name}: ${token.value};\n`;
      });

      radii.forEach((token) => {
        output += `$radius-${token.name}: ${token.value};\n`;
      });
    } else if (format === "json") {
      const jsonOutput = {
        colors: colors.reduce((acc, token) => {
          acc[token.name] = {
            value: token.value,
            category: token.category,
          };
          return acc;
        }, {} as Record<string, { value: string; category: ColorCategory }>),
        typography: typography.reduce((acc, token) => {
          acc[token.name] = {
            fontFamily: token.fontFamily,
            fontSize: token.fontSize,
            fontWeight: token.fontWeight,
            lineHeight: token.lineHeight,
          };
          return acc;
        }, {} as Record<string, { fontFamily: string; fontSize: string; fontWeight: string; lineHeight: string }>),
        spacing: spacing.reduce((acc, token) => {
          acc[token.name] = token.value;
          return acc;
        }, {} as Record<string, string>),
        shadows: shadows.reduce((acc, token) => {
          acc[token.name] = token.value;
          return acc;
        }, {} as Record<string, string>),
        radii: radii.reduce((acc, token) => {
          acc[token.name] = token.value;
          return acc;
        }, {} as Record<string, string>),
      };
      output = JSON.stringify(jsonOutput, null, 2);
    } else if (format === "tailwind") {
      output = "module.exports = {\n  theme: {\n    extend: {\n";

      if (colors.length > 0) {
        output += "      colors: {\n";
        colors.forEach((token) => {
          output += `        '${token.name}': '${token.value}',\n`;
        });
        output += "      },\n";
      }

      if (spacing.length > 0) {
        output += "      spacing: {\n";
        spacing.forEach((token) => {
          output += `        '${token.name}': '${token.value}',\n`;
        });
        output += "      },\n";
      }

      if (shadows.length > 0) {
        output += "      boxShadow: {\n";
        shadows.forEach((token) => {
          output += `        '${token.name}': '${token.value}',\n`;
        });
        output += "      },\n";
      }

      if (radii.length > 0) {
        output += "      borderRadius: {\n";
        radii.forEach((token) => {
          output += `        '${token.name}': '${token.value}',\n`;
        });
        output += "      },\n";
      }

      output += "    },\n  },\n}";
    }

    copyToClipboard(output, `${format.toUpperCase()} export`);
  };

  const getCurrentTokens = () => {
    switch (activeTab) {
      case "colors":
        return colors;
      case "typography":
        return typography;
      case "spacing":
        return spacing;
      case "shadows":
        return shadows;
      case "radii":
        return radii;
      default:
        return [];
    }
  };

  const renderTokensList = () => {
    const tokens = getCurrentTokens();

    if (tokens.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-center px-4 py-8">
          {activeTab === "colors" && <Palette className="w-8 h-8 text-muted-foreground mb-2 @md:w-10 @md:h-10" />}
          {activeTab === "typography" && <Type className="w-8 h-8 text-muted-foreground mb-2 @md:w-10 @md:h-10" />}
          {activeTab === "spacing" && <Ruler className="w-8 h-8 text-muted-foreground mb-2 @md:w-10 @md:h-10" />}
          {activeTab === "shadows" && <Box className="w-8 h-8 text-muted-foreground mb-2 @md:w-10 @md:h-10" />}
          {activeTab === "radii" && <Circle className="w-8 h-8 text-muted-foreground mb-2 @md:w-10 @md:h-10" />}
          <p className="text-xs text-muted-foreground mb-1 @md:text-sm">No tokens yet</p>
          <p className="text-xs text-muted-foreground/60 @sm:text-xs">
            Click the + button to add a token
          </p>
        </div>
      );
    }

    return (
      <ScrollArea className="flex-1 -mx-1 px-1">
        <div className="space-y-1.5 pb-2">
          <AnimatePresence>
            {tokens.map((token, index) => (
              <motion.div
                key={token.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ delay: index * 0.03 }}
                className="group relative"
              >
                {renderTokenItem(token)}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </ScrollArea>
    );
  };

  const renderTokenItem = (token: ColorToken | TypographyToken | SpacingToken | ShadowToken | RadiusToken) => {
    if (activeTab === "colors" && "category" in token) {
      const colorToken = token as ColorToken;
      return (
        <div className="rounded-lg p-2 bg-secondary/30 hover:bg-secondary/50 transition-colors @sm:p-2.5">
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded shadow-sm flex-shrink-0 border-2 border-border @sm:w-10 @sm:h-10"
              style={{ backgroundColor: colorToken.value }}
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <p className="text-xs font-medium truncate @sm:text-sm">{colorToken.name}</p>
                <Badge variant="outline" className="text-[9px] h-4 @sm:text-[10px]">
                  {colorToken.category}
                </Badge>
              </div>
              <button
                className="text-[10px] font-mono text-muted-foreground hover:text-primary transition-colors @sm:text-xs"
                onClick={() => copyToClipboard(colorToken.value, colorToken.name)}
              >
                {colorToken.value}
              </button>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity @sm:h-7 @sm:w-7"
                onClick={() => handleOpenEditDialog(token)}
              >
                <Edit2 className="w-3 h-3 @sm:w-3.5 @sm:h-3.5" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity @sm:h-7 @sm:w-7"
                onClick={() => handleDeleteToken(token.id)}
              >
                <Trash2 className="w-3 h-3 text-destructive @sm:w-3.5 @sm:h-3.5" />
              </Button>
            </div>
          </div>
        </div>
      );
    } else if (activeTab === "typography" && "fontFamily" in token) {
      const typoToken = token as TypographyToken;
      return (
        <div className="rounded-lg p-2 bg-secondary/30 hover:bg-secondary/50 transition-colors @sm:p-2.5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium @sm:text-sm">{typoToken.name}</p>
            <div className="flex items-center gap-1">
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity @sm:h-7 @sm:w-7"
                onClick={() => handleOpenEditDialog(token)}
              >
                <Edit2 className="w-3 h-3 @sm:w-3.5 @sm:h-3.5" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity @sm:h-7 @sm:w-7"
                onClick={() => handleDeleteToken(token.id)}
              >
                <Trash2 className="w-3 h-3 text-destructive @sm:w-3.5 @sm:h-3.5" />
              </Button>
            </div>
          </div>
          <div
            className="p-2 rounded bg-background text-xs border @sm:text-sm @sm:p-2.5"
            style={{
              fontFamily: typoToken.fontFamily,
              fontSize: typoToken.fontSize,
              fontWeight: typoToken.fontWeight,
              lineHeight: typoToken.lineHeight,
            }}
          >
            The quick brown fox jumps over the lazy dog
          </div>
          <div className="mt-1.5 flex flex-wrap gap-1 text-[9px] text-muted-foreground @sm:text-[10px]">
            <button
              className="hover:text-primary transition-colors"
              onClick={() => copyToClipboard(typoToken.fontFamily, "Font Family")}
            >
              {typoToken.fontFamily}
            </button>
            <span>•</span>
            <button
              className="hover:text-primary transition-colors"
              onClick={() => copyToClipboard(typoToken.fontSize, "Font Size")}
            >
              {typoToken.fontSize}
            </button>
            <span>•</span>
            <button
              className="hover:text-primary transition-colors"
              onClick={() => copyToClipboard(typoToken.fontWeight, "Font Weight")}
            >
              {typoToken.fontWeight}
            </button>
            <span>•</span>
            <button
              className="hover:text-primary transition-colors"
              onClick={() => copyToClipboard(typoToken.lineHeight, "Line Height")}
            >
              {typoToken.lineHeight}
            </button>
          </div>
        </div>
      );
    } else if (activeTab === "spacing" && "unit" in token) {
      const spacingToken = token as SpacingToken;
      return (
        <div className="rounded-lg p-2 bg-secondary/30 hover:bg-secondary/50 transition-colors @sm:p-2.5">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <p className="text-xs font-medium @sm:text-sm">{spacingToken.name}</p>
              <button
                className="text-[10px] font-mono text-muted-foreground hover:text-primary transition-colors @sm:text-xs"
                onClick={() => copyToClipboard(spacingToken.value, spacingToken.name)}
              >
                {spacingToken.value}
              </button>
            </div>
            <div className="flex items-center gap-1">
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity @sm:h-7 @sm:w-7"
                onClick={() => handleOpenEditDialog(token)}
              >
                <Edit2 className="w-3 h-3 @sm:w-3.5 @sm:h-3.5" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity @sm:h-7 @sm:w-7"
                onClick={() => handleDeleteToken(token.id)}
              >
                <Trash2 className="w-3 h-3 text-destructive @sm:w-3.5 @sm:h-3.5" />
              </Button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div
              className="bg-primary rounded"
              style={{ width: spacingToken.value, height: "16px" }}
            />
            <span className="text-[10px] text-muted-foreground @sm:text-xs">Preview</span>
          </div>
        </div>
      );
    } else if (activeTab === "shadows" && "value" in token && !("category" in token) && !("fontFamily" in token) && !("unit" in token)) {
      const shadowToken = token as ShadowToken;
      return (
        <div className="rounded-lg p-2 bg-secondary/30 hover:bg-secondary/50 transition-colors @sm:p-2.5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium @sm:text-sm">{shadowToken.name}</p>
            <div className="flex items-center gap-1">
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity @sm:h-7 @sm:w-7"
                onClick={() => handleOpenEditDialog(token)}
              >
                <Edit2 className="w-3 h-3 @sm:w-3.5 @sm:h-3.5" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity @sm:h-7 @sm:w-7"
                onClick={() => handleDeleteToken(token.id)}
              >
                <Trash2 className="w-3 h-3 text-destructive @sm:w-3.5 @sm:h-3.5" />
              </Button>
            </div>
          </div>
          <div
            className="h-12 rounded bg-background border flex items-center justify-center text-[10px] text-muted-foreground @sm:text-xs"
            style={{ boxShadow: shadowToken.value }}
          >
            Preview
          </div>
          <button
            className="mt-1.5 text-[9px] font-mono text-muted-foreground hover:text-primary transition-colors block truncate w-full text-left @sm:text-[10px]"
            onClick={() => copyToClipboard(shadowToken.value, shadowToken.name)}
          >
            {shadowToken.value}
          </button>
        </div>
      );
    } else if (activeTab === "radii") {
      const radiusToken = token as RadiusToken;
      return (
        <div className="rounded-lg p-2 bg-secondary/30 hover:bg-secondary/50 transition-colors @sm:p-2.5">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <p className="text-xs font-medium @sm:text-sm">{radiusToken.name}</p>
              <button
                className="text-[10px] font-mono text-muted-foreground hover:text-primary transition-colors @sm:text-xs"
                onClick={() => copyToClipboard(radiusToken.value, radiusToken.name)}
              >
                {radiusToken.value}
              </button>
            </div>
            <div className="flex items-center gap-1">
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity @sm:h-7 @sm:w-7"
                onClick={() => handleOpenEditDialog(token)}
              >
                <Edit2 className="w-3 h-3 @sm:w-3.5 @sm:h-3.5" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity @sm:h-7 @sm:w-7"
                onClick={() => handleDeleteToken(token.id)}
              >
                <Trash2 className="w-3 h-3 text-destructive @sm:w-3.5 @sm:h-3.5" />
              </Button>
            </div>
          </div>
          <div
            className="h-12 bg-primary border flex items-center justify-center text-xs text-primary-foreground"
            style={{ borderRadius: radiusToken.value }}
          >
            Preview
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="h-full w-full @container">
      <div className="flex flex-col h-full p-3 @sm:p-4 @md:p-5">
        <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as TokenCategory)} className="flex-1 flex flex-col">
          <div className="flex items-center justify-between mb-2 @sm:mb-3">
            <TabsList className="grid grid-cols-5 h-8 @sm:h-9">
              <TabsTrigger value="colors" className="text-[10px] px-1 @sm:text-xs @sm:px-2" title="Colors">
                <Palette className="w-3 h-3 @sm:w-3.5 @sm:h-3.5" />
              </TabsTrigger>
              <TabsTrigger value="typography" className="text-[10px] px-1 @sm:text-xs @sm:px-2" title="Typography">
                <Type className="w-3 h-3 @sm:w-3.5 @sm:h-3.5" />
              </TabsTrigger>
              <TabsTrigger value="spacing" className="text-[10px] px-1 @sm:text-xs @sm:px-2" title="Spacing">
                <Ruler className="w-3 h-3 @sm:w-3.5 @sm:h-3.5" />
              </TabsTrigger>
              <TabsTrigger value="shadows" className="text-[10px] px-1 @sm:text-xs @sm:px-2" title="Shadows">
                <Box className="w-3 h-3 @sm:w-3.5 @sm:h-3.5" />
              </TabsTrigger>
              <TabsTrigger value="radii" className="text-[10px] px-1 @sm:text-xs @sm:px-2" title="Border Radii">
                <Circle className="w-3 h-3 @sm:w-3.5 @sm:h-3.5" />
              </TabsTrigger>
            </TabsList>

            <Button
              size="icon"
              variant="outline"
              className="h-8 w-8 flex-shrink-0 @sm:h-9 @sm:w-9"
              onClick={handleOpenAddDialog}
            >
              <Plus className="w-3.5 h-3.5 @sm:w-4 @sm:h-4" />
            </Button>
          </div>

          <TabsContent value="colors" className="flex-1 overflow-hidden flex flex-col mt-0">
            {renderTokensList()}
          </TabsContent>

          <TabsContent value="typography" className="flex-1 overflow-hidden flex flex-col mt-0">
            {renderTokensList()}
          </TabsContent>

          <TabsContent value="spacing" className="flex-1 overflow-hidden flex flex-col mt-0">
            {renderTokensList()}
          </TabsContent>

          <TabsContent value="shadows" className="flex-1 overflow-hidden flex flex-col mt-0">
            {renderTokensList()}
          </TabsContent>

          <TabsContent value="radii" className="flex-1 overflow-hidden flex flex-col mt-0">
            {renderTokensList()}
          </TabsContent>
        </Tabs>

        {/* Export buttons */}
        {getCurrentTokens().length > 0 && (
          <div className="mt-2 pt-2 border-t flex gap-1 @sm:mt-3 @sm:pt-3">
            <Button
              size="sm"
              variant="ghost"
              className="h-6 text-[10px] flex-1 @sm:h-7 @sm:text-xs"
              onClick={() => exportTokens("css")}
            >
              <Download className="w-3 h-3 mr-1" />
              CSS
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 text-[10px] flex-1 @sm:h-7 @sm:text-xs"
              onClick={() => exportTokens("scss")}
            >
              <Download className="w-3 h-3 mr-1" />
              SCSS
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 text-[10px] flex-1 @sm:h-7 @sm:text-xs"
              onClick={() => exportTokens("json")}
            >
              <Download className="w-3 h-3 mr-1" />
              JSON
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 text-[10px] flex-1 @sm:h-7 @sm:text-xs"
              onClick={() => exportTokens("tailwind")}
            >
              <Download className="w-3 h-3 mr-1" />
              Tailwind
            </Button>
          </div>
        )}
      </div>

      {/* Add Token Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5 text-primary" />
              Add {activeTab === "radii" ? "Radius" : activeTab.slice(0, -1).charAt(0).toUpperCase() + activeTab.slice(0, -1).slice(1)} Token
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {activeTab === "colors" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="color-name">Name</Label>
                  <Input
                    id="color-name"
                    value={formColorName}
                    onChange={(e) => setFormColorName(e.target.value)}
                    placeholder="primary-blue"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="color-value">Color</Label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      id="color-value"
                      value={formColorValue}
                      onChange={(e) => setFormColorValue(e.target.value)}
                      className="w-12 h-10 rounded cursor-pointer border-2 border-border"
                    />
                    <Input
                      value={formColorValue}
                      onChange={(e) => setFormColorValue(e.target.value)}
                      className="font-mono"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="color-category">Category</Label>
                  <Select value={formColorCategory} onValueChange={(val) => setFormColorCategory(val as ColorCategory)}>
                    <SelectTrigger id="color-category">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="primary">Primary</SelectItem>
                      <SelectItem value="secondary">Secondary</SelectItem>
                      <SelectItem value="neutral">Neutral</SelectItem>
                      <SelectItem value="semantic">Semantic</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
            {activeTab === "typography" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="typo-name">Name</Label>
                  <Input
                    id="typo-name"
                    value={formTypoName}
                    onChange={(e) => setFormTypoName(e.target.value)}
                    placeholder="heading-1"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="typo-family">Font Family</Label>
                  <Select value={formTypoFamily} onValueChange={setFormTypoFamily}>
                    <SelectTrigger id="typo-family">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FONT_FAMILIES.map((font) => (
                        <SelectItem key={font} value={font}>
                          {font}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-2">
                    <Label htmlFor="typo-size">Size</Label>
                    <Input
                      id="typo-size"
                      value={formTypoSize}
                      onChange={(e) => setFormTypoSize(e.target.value)}
                      placeholder="16px"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="typo-weight">Weight</Label>
                    <Select value={formTypoWeight} onValueChange={setFormTypoWeight}>
                      <SelectTrigger id="typo-weight">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {FONT_WEIGHTS.map((weight) => (
                          <SelectItem key={weight} value={weight}>
                            {weight}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="typo-line-height">Line H.</Label>
                    <Input
                      id="typo-line-height"
                      value={formTypoLineHeight}
                      onChange={(e) => setFormTypoLineHeight(e.target.value)}
                      placeholder="1.5"
                    />
                  </div>
                </div>
              </>
            )}
            {activeTab === "spacing" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="spacing-name">Name</Label>
                  <Input
                    id="spacing-name"
                    value={formSpacingName}
                    onChange={(e) => setFormSpacingName(e.target.value)}
                    placeholder="md"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="spacing-value">Value</Label>
                  <div className="flex gap-2">
                    <Input
                      id="spacing-value"
                      type="number"
                      value={formSpacingValue}
                      onChange={(e) => setFormSpacingValue(e.target.value)}
                      className="flex-1"
                    />
                    <Select value={formSpacingUnit} onValueChange={(val) => setFormSpacingUnit(val as "px" | "rem")}>
                      <SelectTrigger className="w-20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="px">px</SelectItem>
                        <SelectItem value="rem">rem</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </>
            )}
            {activeTab === "shadows" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="shadow-name">Name</Label>
                  <Input
                    id="shadow-name"
                    value={formShadowName}
                    onChange={(e) => setFormShadowName(e.target.value)}
                    placeholder="sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="shadow-value">CSS Shadow Value</Label>
                  <Input
                    id="shadow-value"
                    value={formShadowValue}
                    onChange={(e) => setFormShadowValue(e.target.value)}
                    placeholder="0 2px 4px rgba(0,0,0,0.1)"
                    className="font-mono text-xs"
                  />
                </div>
              </>
            )}
            {activeTab === "radii" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="radius-name">Name</Label>
                  <Input
                    id="radius-name"
                    value={formRadiusName}
                    onChange={(e) => setFormRadiusName(e.target.value)}
                    placeholder="md"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="radius-value">Value</Label>
                  <Input
                    id="radius-value"
                    value={formRadiusValue}
                    onChange={(e) => setFormRadiusValue(e.target.value)}
                    placeholder="8px"
                  />
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddToken}>Add Token</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Token Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit2 className="w-5 h-5 text-primary" />
              Edit {activeTab === "radii" ? "Radius" : activeTab.slice(0, -1).charAt(0).toUpperCase() + activeTab.slice(0, -1).slice(1)} Token
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {activeTab === "colors" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="edit-color-name">Name</Label>
                  <Input
                    id="edit-color-name"
                    value={formColorName}
                    onChange={(e) => setFormColorName(e.target.value)}
                    placeholder="primary-blue"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-color-value">Color</Label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      id="edit-color-value"
                      value={formColorValue}
                      onChange={(e) => setFormColorValue(e.target.value)}
                      className="w-12 h-10 rounded cursor-pointer border-2 border-border"
                    />
                    <Input
                      value={formColorValue}
                      onChange={(e) => setFormColorValue(e.target.value)}
                      className="font-mono"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-color-category">Category</Label>
                  <Select value={formColorCategory} onValueChange={(val) => setFormColorCategory(val as ColorCategory)}>
                    <SelectTrigger id="edit-color-category">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="primary">Primary</SelectItem>
                      <SelectItem value="secondary">Secondary</SelectItem>
                      <SelectItem value="neutral">Neutral</SelectItem>
                      <SelectItem value="semantic">Semantic</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
            {activeTab === "typography" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="edit-typo-name">Name</Label>
                  <Input
                    id="edit-typo-name"
                    value={formTypoName}
                    onChange={(e) => setFormTypoName(e.target.value)}
                    placeholder="heading-1"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-typo-family">Font Family</Label>
                  <Select value={formTypoFamily} onValueChange={setFormTypoFamily}>
                    <SelectTrigger id="edit-typo-family">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FONT_FAMILIES.map((font) => (
                        <SelectItem key={font} value={font}>
                          {font}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-2">
                    <Label htmlFor="edit-typo-size">Size</Label>
                    <Input
                      id="edit-typo-size"
                      value={formTypoSize}
                      onChange={(e) => setFormTypoSize(e.target.value)}
                      placeholder="16px"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-typo-weight">Weight</Label>
                    <Select value={formTypoWeight} onValueChange={setFormTypoWeight}>
                      <SelectTrigger id="edit-typo-weight">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {FONT_WEIGHTS.map((weight) => (
                          <SelectItem key={weight} value={weight}>
                            {weight}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-typo-line-height">Line H.</Label>
                    <Input
                      id="edit-typo-line-height"
                      value={formTypoLineHeight}
                      onChange={(e) => setFormTypoLineHeight(e.target.value)}
                      placeholder="1.5"
                    />
                  </div>
                </div>
              </>
            )}
            {activeTab === "spacing" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="edit-spacing-name">Name</Label>
                  <Input
                    id="edit-spacing-name"
                    value={formSpacingName}
                    onChange={(e) => setFormSpacingName(e.target.value)}
                    placeholder="md"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-spacing-value">Value</Label>
                  <div className="flex gap-2">
                    <Input
                      id="edit-spacing-value"
                      type="number"
                      value={formSpacingValue}
                      onChange={(e) => setFormSpacingValue(e.target.value)}
                      className="flex-1"
                    />
                    <Select value={formSpacingUnit} onValueChange={(val) => setFormSpacingUnit(val as "px" | "rem")}>
                      <SelectTrigger className="w-20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="px">px</SelectItem>
                        <SelectItem value="rem">rem</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </>
            )}
            {activeTab === "shadows" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="edit-shadow-name">Name</Label>
                  <Input
                    id="edit-shadow-name"
                    value={formShadowName}
                    onChange={(e) => setFormShadowName(e.target.value)}
                    placeholder="sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-shadow-value">CSS Shadow Value</Label>
                  <Input
                    id="edit-shadow-value"
                    value={formShadowValue}
                    onChange={(e) => setFormShadowValue(e.target.value)}
                    placeholder="0 2px 4px rgba(0,0,0,0.1)"
                    className="font-mono text-xs"
                  />
                </div>
              </>
            )}
            {activeTab === "radii" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="edit-radius-name">Name</Label>
                  <Input
                    id="edit-radius-name"
                    value={formRadiusName}
                    onChange={(e) => setFormRadiusName(e.target.value)}
                    placeholder="md"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-radius-value">Value</Label>
                  <Input
                    id="edit-radius-value"
                    value={formRadiusValue}
                    onChange={(e) => setFormRadiusValue(e.target.value)}
                    placeholder="8px"
                  />
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditToken}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
