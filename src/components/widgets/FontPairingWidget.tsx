"use client";

import { useState, useEffect } from "react";
import { Type, Copy, Check, Shuffle, Heart, ChevronDown, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useWidgetStore } from "@/stores/widget-store";
import type { Widget } from "@/types/widget";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";
import { motion } from "motion/react";
import { toast } from "sonner";

interface FontPairingWidgetProps {
  widget: Widget;
}

interface FontPairing {
  id: string;
  heading: {
    name: string;
    weight: string;
    googleUrl: string;
  };
  body: {
    name: string;
    weight: string;
    googleUrl: string;
  };
  categoryKey: string;
  descriptionKey: string;
}

interface FontPairingConfig {
  favoritePairings?: string[];
  sampleText?: string;
  currentPairingIndex?: number;
}

// Curated font pairings
const FONT_PAIRINGS: FontPairing[] = [
  {
    id: "playfair-source",
    heading: { name: "Playfair Display", weight: "700", googleUrl: "Playfair+Display:wght@700" },
    body: { name: "Source Sans Pro", weight: "400", googleUrl: "Source+Sans+Pro:wght@400" },
    categoryKey: "fontPairing.cat.elegant",
    descriptionKey: "fontPairing.desc.playfairSource",
  },
  {
    id: "montserrat-opensans",
    heading: { name: "Montserrat", weight: "700", googleUrl: "Montserrat:wght@700" },
    body: { name: "Open Sans", weight: "400", googleUrl: "Open+Sans:wght@400" },
    categoryKey: "fontPairing.cat.modern",
    descriptionKey: "fontPairing.desc.montserratOpensans",
  },
  {
    id: "poppins-lato",
    heading: { name: "Poppins", weight: "600", googleUrl: "Poppins:wght@600" },
    body: { name: "Lato", weight: "400", googleUrl: "Lato:wght@400" },
    categoryKey: "fontPairing.cat.modern",
    descriptionKey: "fontPairing.desc.poppinsLato",
  },
  {
    id: "roboto-slab-roboto",
    heading: { name: "Roboto Slab", weight: "700", googleUrl: "Roboto+Slab:wght@700" },
    body: { name: "Roboto", weight: "400", googleUrl: "Roboto:wght@400" },
    categoryKey: "fontPairing.cat.tech",
    descriptionKey: "fontPairing.desc.robotoSlabRoboto",
  },
  {
    id: "oswald-lora",
    heading: { name: "Oswald", weight: "600", googleUrl: "Oswald:wght@600" },
    body: { name: "Lora", weight: "400", googleUrl: "Lora:wght@400" },
    categoryKey: "fontPairing.cat.editorial",
    descriptionKey: "fontPairing.desc.oswaldLora",
  },
  {
    id: "raleway-merriweather",
    heading: { name: "Raleway", weight: "700", googleUrl: "Raleway:wght@700" },
    body: { name: "Merriweather", weight: "400", googleUrl: "Merriweather:wght@400" },
    categoryKey: "fontPairing.cat.elegant",
    descriptionKey: "fontPairing.desc.ralewayMerriweather",
  },
  {
    id: "inter-inter",
    heading: { name: "Inter", weight: "700", googleUrl: "Inter:wght@700" },
    body: { name: "Inter", weight: "400", googleUrl: "Inter:wght@400" },
    categoryKey: "fontPairing.cat.uiux",
    descriptionKey: "fontPairing.desc.interInter",
  },
  {
    id: "space-grotesk-work-sans",
    heading: { name: "Space Grotesk", weight: "700", googleUrl: "Space+Grotesk:wght@700" },
    body: { name: "Work Sans", weight: "400", googleUrl: "Work+Sans:wght@400" },
    categoryKey: "fontPairing.cat.modern",
    descriptionKey: "fontPairing.desc.spaceGroteskWorkSans",
  },
  {
    id: "bebas-neue-source-serif",
    heading: { name: "Bebas Neue", weight: "400", googleUrl: "Bebas+Neue" },
    body: { name: "Source Serif Pro", weight: "400", googleUrl: "Source+Serif+Pro:wght@400" },
    categoryKey: "fontPairing.cat.bold",
    descriptionKey: "fontPairing.desc.bebasNeueSourceSerif",
  },
  {
    id: "dm-serif-dm-sans",
    heading: { name: "DM Serif Display", weight: "400", googleUrl: "DM+Serif+Display" },
    body: { name: "DM Sans", weight: "400", googleUrl: "DM+Sans:wght@400" },
    categoryKey: "fontPairing.cat.elegant",
    descriptionKey: "fontPairing.desc.dmSerifDmSans",
  },
  {
    id: "lexend-nunito",
    heading: { name: "Lexend", weight: "700", googleUrl: "Lexend:wght@700" },
    body: { name: "Nunito", weight: "400", googleUrl: "Nunito:wght@400" },
    categoryKey: "fontPairing.cat.accessible",
    descriptionKey: "fontPairing.desc.lexendNunito",
  },
  {
    id: "archivo-libre-baskerville",
    heading: { name: "Archivo Black", weight: "400", googleUrl: "Archivo+Black" },
    body: { name: "Libre Baskerville", weight: "400", googleUrl: "Libre+Baskerville:wght@400" },
    categoryKey: "fontPairing.cat.editorial",
    descriptionKey: "fontPairing.desc.archivoLibreBaskerville",
  },
  {
    id: "josefin-sans-pt-serif",
    heading: { name: "Josefin Sans", weight: "700", googleUrl: "Josefin+Sans:wght@700" },
    body: { name: "PT Serif", weight: "400", googleUrl: "PT+Serif:wght@400" },
    categoryKey: "fontPairing.cat.vintage",
    descriptionKey: "fontPairing.desc.josefinSansPtSerif",
  },
  {
    id: "barlow-barlow",
    heading: { name: "Barlow Condensed", weight: "700", googleUrl: "Barlow+Condensed:wght@700" },
    body: { name: "Barlow", weight: "400", googleUrl: "Barlow:wght@400" },
    categoryKey: "fontPairing.cat.industrial",
    descriptionKey: "fontPairing.desc.barlowBarlow",
  },
  {
    id: "manrope-crimson",
    heading: { name: "Manrope", weight: "800", googleUrl: "Manrope:wght@800" },
    body: { name: "Crimson Text", weight: "400", googleUrl: "Crimson+Text:wght@400" },
    categoryKey: "fontPairing.cat.mixed",
    descriptionKey: "fontPairing.desc.manropeCrimson",
  },
  {
    id: "outfit-outfit",
    heading: { name: "Outfit", weight: "700", googleUrl: "Outfit:wght@700" },
    body: { name: "Outfit", weight: "400", googleUrl: "Outfit:wght@400" },
    categoryKey: "fontPairing.cat.uiux",
    descriptionKey: "fontPairing.desc.outfitOutfit",
  },
];

// Generate Google Fonts import URL
function generateImportUrl(pairing: FontPairing): string {
  return `@import url('https://fonts.googleapis.com/css2?family=${pairing.heading.googleUrl}&family=${pairing.body.googleUrl}&display=swap');`;
}

// Generate CSS code
function generateCssCode(pairing: FontPairing): string {
  return `/* Heading */
font-family: '${pairing.heading.name}', sans-serif;
font-weight: ${pairing.heading.weight};

/* Body */
font-family: '${pairing.body.name}', sans-serif;
font-weight: ${pairing.body.weight};`;
}

export function FontPairingWidget({ widget }: FontPairingWidgetProps) {
  const { t } = useTranslation();
  const updateWidget = useWidgetStore((state) => state.updateWidget);
  const storeWidget = useWidgetStore(
    (state) => state.widgets.find((w) => w.id === widget.id)
  );

  const currentWidget = storeWidget || widget;
  const config = currentWidget.config as FontPairingConfig | undefined;

  const [currentIndex, setCurrentIndex] = useState(config?.currentPairingIndex || 0);
  const [sampleText, setSampleText] = useState(config?.sampleText || "");
  const [copiedValue, setCopiedValue] = useState<string | null>(null);
  const [isCodeOpen, setIsCodeOpen] = useState(false);
  const [fontsLoaded, setFontsLoaded] = useState(false);

  const currentPairing = FONT_PAIRINGS[currentIndex];
  const favoritePairings = config?.favoritePairings || [];
  const isFavorite = favoritePairings.includes(currentPairing.id);

  // Load fonts dynamically
  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = `https://fonts.googleapis.com/css2?family=${currentPairing.heading.googleUrl}&family=${currentPairing.body.googleUrl}&display=swap`;

    link.onload = () => setFontsLoaded(true);
    document.head.appendChild(link);

    return () => {
      document.head.removeChild(link);
      setFontsLoaded(false);
    };
  }, [currentPairing]);

  // Save current index
  useEffect(() => {
    updateWidget(currentWidget.id, {
      config: {
        ...currentWidget.config,
        currentPairingIndex: currentIndex,
        sampleText,
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only save when user changes index/text; including currentWidget.config would cause infinite loop
  }, [currentIndex, sampleText]);

  const shufflePairing = () => {
    const newIndex = Math.floor(Math.random() * FONT_PAIRINGS.length);
    setCurrentIndex(newIndex);
    toast.success(t("fontPairing.newPairing"));
  };

  const nextPairing = () => {
    setCurrentIndex((prev) => (prev + 1) % FONT_PAIRINGS.length);
  };

  const prevPairing = () => {
    setCurrentIndex((prev) => (prev - 1 + FONT_PAIRINGS.length) % FONT_PAIRINGS.length);
  };

  const toggleFavorite = () => {
    const newFavorites = isFavorite
      ? favoritePairings.filter((id) => id !== currentPairing.id)
      : [...favoritePairings, currentPairing.id];

    updateWidget(currentWidget.id, {
      config: {
        ...currentWidget.config,
        favoritePairings: newFavorites,
      },
    });

    toast.success(isFavorite ? t("fontPairing.removedFromFavorites") : t("fontPairing.addedToFavorites"));
  };

  const copyToClipboard = async (text: string, label: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedValue(text);
    toast.success(t("fontPairing.copiedToClipboard"), {
      description: label,
      duration: 1500,
    });
    setTimeout(() => setCopiedValue(null), 2000);
  };

  return (
    <div className="h-full w-full flex flex-col @container">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-6 h-6 rounded-md bg-primary/10">
            <Type className="w-3.5 h-3.5 text-primary" />
          </div>
          <h3 className="text-xs font-semibold">{t("fontPairing.title")}</h3>
        </div>
        <div className="flex items-center gap-1">
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6"
            onClick={shufflePairing}
            title={t("fontPairing.randomPairing")}
          >
            <Shuffle className="w-3.5 h-3.5" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6"
            onClick={toggleFavorite}
          >
            <Heart
              className={cn(
                "w-3.5 h-3.5",
                isFavorite && "fill-red-500 text-red-500"
              )}
            />
          </Button>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between mb-2">
        <Button
          size="sm"
          variant="ghost"
          className="h-6 px-2 text-xs"
          onClick={prevPairing}
        >
          Anterior
        </Button>
        <span className="text-xs text-muted-foreground">
          {currentIndex + 1} / {FONT_PAIRINGS.length}
        </span>
        <Button
          size="sm"
          variant="ghost"
          className="h-6 px-2 text-xs"
          onClick={nextPairing}
        >
          Siguiente
        </Button>
      </div>

      {/* Font Preview */}
      <motion.div
        key={currentPairing.id}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex-1 flex flex-col overflow-hidden"
      >
        {/* Sample text input */}
        <Input
          value={sampleText}
          onChange={(e) => setSampleText(e.target.value)}
          placeholder={t("fontPairing.sampleText")}
          className="mb-2 h-7 text-xs"
        />

        {/* Preview card */}
        <div className="bg-card rounded-lg p-3 border border-border mb-2 flex-shrink-0">
          <div className="space-y-2">
            {/* Heading preview */}
            <div>
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                Titulo
              </span>
              <p
                className="text-xl leading-tight transition-opacity"
                style={{
                  fontFamily: `'${currentPairing.heading.name}', sans-serif`,
                  fontWeight: currentPairing.heading.weight,
                  opacity: fontsLoaded ? 1 : 0.5,
                }}
              >
                {sampleText || t("fontPairing.sampleTitleDefault")}
              </p>
            </div>

            {/* Body preview */}
            <div>
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                Cuerpo
              </span>
              <p
                className="text-sm leading-relaxed transition-opacity"
                style={{
                  fontFamily: `'${currentPairing.body.name}', sans-serif`,
                  fontWeight: currentPairing.body.weight,
                  opacity: fontsLoaded ? 1 : 0.5,
                }}
              >
                Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do
                eiusmod tempor incididunt ut labore.
              </p>
            </div>
          </div>
        </div>

        {/* Font info */}
        <div className="space-y-1 mb-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Titulo:</span>
            <span className="font-medium">{currentPairing.heading.name}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Cuerpo:</span>
            <span className="font-medium">{currentPairing.body.name}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">{t("fontPairing.category")}:</span>
            <span className="font-medium">{t(currentPairing.categoryKey)}</span>
          </div>
        </div>

        <p className="text-[10px] text-muted-foreground mb-2 line-clamp-2">
          {t(currentPairing.descriptionKey)}
        </p>

        {/* Code section */}
        <Collapsible open={isCodeOpen} onOpenChange={setIsCodeOpen} className="mt-auto">
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="w-full h-6 text-xs justify-between"
            >
              <span>{t("fontPairing.code")}</span>
              <ChevronDown
                className={cn(
                  "w-3 h-3 transition-transform",
                  isCodeOpen && "rotate-180"
                )}
              />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="space-y-1.5 pt-2">
              <Button
                variant="outline"
                size="sm"
                className="w-full h-7 text-xs justify-start"
                onClick={() =>
                  copyToClipboard(generateImportUrl(currentPairing), "Import URL")
                }
              >
                {copiedValue === generateImportUrl(currentPairing) ? (
                  <Check className="w-3 h-3 mr-1.5" />
                ) : (
                  <Copy className="w-3 h-3 mr-1.5" />
                )}
                {t("fontPairing.copyImport")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="w-full h-7 text-xs justify-start"
                onClick={() =>
                  copyToClipboard(generateCssCode(currentPairing), "CSS")
                }
              >
                {copiedValue === generateCssCode(currentPairing) ? (
                  <Check className="w-3 h-3 mr-1.5" />
                ) : (
                  <Copy className="w-3 h-3 mr-1.5" />
                )}
                {t("fontPairing.copyCss")}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="w-full h-7 text-xs justify-start"
                asChild
              >
                <a
                  href={`https://fonts.google.com/specimen/${currentPairing.heading.name.replace(" ", "+")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="w-3 h-3 mr-1.5" />
                  {t("fontPairing.viewOnGoogleFonts")}
                </a>
              </Button>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </motion.div>
    </div>
  );
}
