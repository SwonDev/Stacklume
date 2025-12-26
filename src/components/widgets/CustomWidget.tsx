"use client";

import { useState, useEffect, useMemo } from "react";
import DOMPurify from "dompurify";
import {
  Sparkles,
  Link as LinkIcon,
  Type,
  Timer,
  Code2,
  Image as ImageIcon,
  CheckSquare,
  Plus,
  X,
  ExternalLink,
  Calendar,
  Settings,
  Trash2,
  Check,
  GripVertical,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import type { Widget } from "@/types/widget";
import { useWidgetStore } from "@/stores/widget-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface CustomWidgetProps {
  widget: Widget;
}

type CustomMode = "links" | "text" | "countdown" | "embed" | "gallery" | "checklist";

interface CustomLink {
  id: string;
  title: string;
  url: string;
  icon?: string;
}

interface GalleryImage {
  id: string;
  url: string;
  alt?: string;
  caption?: string;
}

interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

const SAFE_EMBED_DOMAINS = [
  "youtube.com",
  "youtu.be",
  "vimeo.com",
  "spotify.com",
  "soundcloud.com",
  "codepen.io",
  "codesandbox.io",
  "figma.com",
  "drive.google.com",
  "docs.google.com",
];

const MODE_OPTIONS = [
  { value: "links", label: "Links List", icon: LinkIcon },
  { value: "text", label: "Text/HTML", icon: Type },
  { value: "countdown", label: "Countdown", icon: Timer },
  { value: "embed", label: "Embed", icon: Code2 },
  { value: "gallery", label: "Image Gallery", icon: ImageIcon },
  { value: "checklist", label: "Checklist", icon: CheckSquare },
] as const;

export function CustomWidget({ widget }: CustomWidgetProps) {
  const { updateWidget } = useWidgetStore();
  const [isConfiguring, setIsConfiguring] = useState(false);

  const mode = (widget.config?.customMode || "links") as CustomMode;
  const background = widget.config?.customBackground || "";
  const textColor = widget.config?.customTextColor || "";
  const gradient = widget.config?.customGradient || "";

  // Get initial data
  const links = (widget.config?.customLinks || []) as CustomLink[];
  const text = widget.config?.customText || "";
  const countdownDate = widget.config?.countdownDate || "";
  const countdownTitle = widget.config?.countdownTitle || "Countdown";
  const countdownShowTime = widget.config?.countdownShowTime ?? true;
  const embedUrl = widget.config?.embedUrl || "";
  const embedHeight = widget.config?.embedHeight || "400px";
  const galleryImages = (widget.config?.galleryImages || []) as GalleryImage[];
  const galleryLayout = widget.config?.galleryLayout || "grid";
  const checklistItems = (widget.config?.checklistItems || []) as ChecklistItem[];

  const containerStyle = useMemo(() => {
    const style: React.CSSProperties = {};
    if (gradient) {
      style.background = gradient;
    } else if (background) {
      style.backgroundColor = background;
    }
    if (textColor) {
      style.color = textColor;
    }
    return style;
  }, [background, textColor, gradient]);

  const updateConfig = (updates: Record<string, unknown>) => {
    updateWidget(widget.id, {
      config: {
        ...widget.config,
        ...updates,
      },
    });
  };

  const handleModeChange = (newMode: CustomMode) => {
    updateConfig({ customMode: newMode });
  };

  // Empty state for each mode
  const renderEmptyState = () => {
    const Icon = MODE_OPTIONS.find((m) => m.value === mode)?.icon || Sparkles;
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center gap-3 pointer-events-none">
        <div className="w-12 h-12 rounded-full bg-secondary/50 flex items-center justify-center">
          <Icon className="w-5 h-5 text-muted-foreground" />
        </div>
        <div className="px-4">
          <p className="text-sm text-muted-foreground mb-1">No content configured</p>
          <p className="text-xs text-muted-foreground/60">
            Click the settings button to configure
          </p>
        </div>
      </div>
    );
  };

  if (isConfiguring) {
    return (
      <div className="@container h-full w-full" style={containerStyle}>
        <ConfigurationPanel
          widget={widget}
          mode={mode}
          onModeChange={handleModeChange}
          onClose={() => setIsConfiguring(false)}
          updateConfig={updateConfig}
        />
      </div>
    );
  }

  return (
    <div className="@container h-full w-full relative" style={containerStyle}>
      {/* Settings button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsConfiguring(true)}
        className="absolute top-2 right-2 z-10 h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <Settings className="w-3.5 h-3.5" />
      </Button>

      {/* Render content based on mode */}
      {mode === "links" && (
        <LinksMode
          links={links}
          isEmpty={links.length === 0}
          renderEmpty={renderEmptyState}
        />
      )}

      {mode === "text" && (
        <TextMode text={text} isEmpty={!text} renderEmpty={renderEmptyState} />
      )}

      {mode === "countdown" && (
        <CountdownMode
          date={countdownDate}
          title={countdownTitle}
          showTime={countdownShowTime}
          isEmpty={!countdownDate}
          renderEmpty={renderEmptyState}
        />
      )}

      {mode === "embed" && (
        <EmbedMode
          url={embedUrl}
          height={embedHeight}
          isEmpty={!embedUrl}
          renderEmpty={renderEmptyState}
        />
      )}

      {mode === "gallery" && (
        <GalleryMode
          images={galleryImages}
          layout={galleryLayout as "grid" | "masonry" | "carousel"}
          isEmpty={galleryImages.length === 0}
          renderEmpty={renderEmptyState}
        />
      )}

      {mode === "checklist" && (
        <ChecklistMode
          items={checklistItems}
          onToggle={(id) => {
            const updated = checklistItems.map((item) =>
              item.id === id ? { ...item, completed: !item.completed } : item
            );
            updateConfig({ checklistItems: updated });
          }}
          isEmpty={checklistItems.length === 0}
          renderEmpty={renderEmptyState}
        />
      )}
    </div>
  );
}

// Links Mode Component
function LinksMode({
  links,
  isEmpty,
  renderEmpty,
}: {
  links: CustomLink[];
  isEmpty: boolean;
  renderEmpty: () => React.ReactElement;
}) {
  if (isEmpty) return renderEmpty();

  return (
    <div className="h-full w-full p-3 @sm:p-4 overflow-y-auto">
      <div className="space-y-2">
        {links.map((link) => (
          <motion.a
            key={link.id}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "flex items-center gap-3 p-2.5 rounded-lg",
              "bg-secondary/30 hover:bg-secondary/50",
              "border border-border/50 hover:border-border",
              "transition-all duration-200",
              "group"
            )}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="flex-shrink-0 w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center">
              {link.icon ? (
                <span className="text-lg">{link.icon}</span>
              ) : (
                <LinkIcon className="w-4 h-4 text-primary" />
              )}
            </div>
            <span className="flex-1 text-sm font-medium truncate">{link.title}</span>
            <ExternalLink className="w-3.5 h-3.5 opacity-0 group-hover:opacity-70 transition-opacity" />
          </motion.a>
        ))}
      </div>
    </div>
  );
}

// Text Mode Component
function TextMode({
  text,
  isEmpty,
  renderEmpty,
}: {
  text: string;
  isEmpty: boolean;
  renderEmpty: () => React.ReactElement;
}) {
  // Sanitize HTML to prevent XSS attacks - hook must be before early return
  const sanitizedHtml = useMemo(() => {
    return DOMPurify.sanitize(text, {
      ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'code', 'pre', 'span', 'div'],
      ALLOWED_ATTR: ['href', 'target', 'rel', 'class', 'style'],
      ALLOW_DATA_ATTR: false,
    });
  }, [text]);

  if (isEmpty) return renderEmpty();

  return (
    <div className="h-full w-full p-3 @sm:p-4 overflow-y-auto">
      <div
        className="prose prose-sm max-w-none dark:prose-invert text-xs @sm:text-sm @md:text-base leading-relaxed"
        dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
      />
    </div>
  );
}

// Countdown Mode Component
function CountdownMode({
  date,
  title,
  showTime,
  isEmpty,
  renderEmpty,
}: {
  date: string;
  title: string;
  showTime: boolean;
  isEmpty: boolean;
  renderEmpty: () => React.ReactElement;
}) {
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
  } | null>(null);

  useEffect(() => {
    if (!date) return;

    const calculateTimeLeft = () => {
      const targetDate = new Date(date).getTime();
      const now = new Date().getTime();
      const difference = targetDate - now;

      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60),
        });
      } else {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(timer);
  }, [date]);

  if (isEmpty) return renderEmpty();

  return (
    <div className="h-full w-full flex flex-col items-center justify-center p-4 text-center">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="space-y-4 w-full"
      >
        <div className="flex items-center justify-center gap-2 mb-4">
          <Calendar className="w-5 h-5 text-primary" />
          <h3 className="text-lg @sm:text-xl @md:text-2xl font-bold">{title}</h3>
        </div>

        {timeLeft && (
          <div className="grid grid-cols-2 @sm:grid-cols-4 gap-2 @sm:gap-4 max-w-md mx-auto">
            <CountdownUnit value={timeLeft.days} label="Days" />
            <CountdownUnit value={timeLeft.hours} label="Hours" />
            {showTime && (
              <>
                <CountdownUnit value={timeLeft.minutes} label="Minutes" />
                <CountdownUnit value={timeLeft.seconds} label="Seconds" />
              </>
            )}
          </div>
        )}

        <p className="text-xs @sm:text-sm text-muted-foreground mt-4">
          {new Date(date).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>
      </motion.div>
    </div>
  );
}

function CountdownUnit({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center p-2 @sm:p-3 rounded-lg bg-secondary/30 border border-border/50">
      <span className="text-2xl @sm:text-3xl @md:text-4xl font-bold tabular-nums">
        {value.toString().padStart(2, "0")}
      </span>
      <span className="text-xs @sm:text-sm text-muted-foreground mt-1">{label}</span>
    </div>
  );
}

// Embed Mode Component
function EmbedMode({
  url,
  height,
  isEmpty,
  renderEmpty,
}: {
  url: string;
  height: string;
  isEmpty: boolean;
  renderEmpty: () => React.ReactElement;
}) {
  if (isEmpty) return renderEmpty();

  const isSafeDomain = SAFE_EMBED_DOMAINS.some((domain) => url.includes(domain));

  if (!isSafeDomain) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center p-4 text-center">
        <Code2 className="w-12 h-12 text-destructive mb-4" />
        <p className="text-sm font-medium text-destructive">Unsafe embed domain</p>
        <p className="text-xs text-muted-foreground mt-2">
          Only whitelisted domains are allowed for embeds
        </p>
      </div>
    );
  }

  return (
    <div className="h-full w-full">
      <iframe
        src={url}
        className="w-full h-full border-0"
        style={{ height }}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        title="Embedded content"
      />
    </div>
  );
}

// Gallery Mode Component
function GalleryMode({
  images,
  layout,
  isEmpty,
  renderEmpty,
}: {
  images: GalleryImage[];
  layout: "grid" | "masonry" | "carousel";
  isEmpty: boolean;
  renderEmpty: () => React.ReactElement;
}) {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (isEmpty) return renderEmpty();

  if (layout === "carousel") {
    return (
      <div className="h-full w-full relative flex items-center justify-center p-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            className="flex-1 flex flex-col items-center justify-center"
          >
            <img
              src={images[currentIndex].url}
              alt={images[currentIndex].alt || "Gallery image"}
              className="max-w-full max-h-[70%] object-contain rounded-lg"
            />
            {images[currentIndex].caption && (
              <p className="text-sm text-muted-foreground mt-4 text-center">
                {images[currentIndex].caption}
              </p>
            )}
          </motion.div>
        </AnimatePresence>

        {images.length > 1 && (
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1))
              }
              className="absolute left-2 top-1/2 -translate-y-1/2"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1))
              }
              className="absolute right-2 top-1/2 -translate-y-1/2"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
              {images.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentIndex(idx)}
                  className={cn(
                    "w-2 h-2 rounded-full transition-all",
                    idx === currentIndex ? "bg-primary w-6" : "bg-muted-foreground/30"
                  )}
                />
              ))}
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="h-full w-full p-3 @sm:p-4 overflow-y-auto">
      <div
        className={cn(
          "grid gap-2 @sm:gap-3",
          layout === "grid" && "grid-cols-2 @md:grid-cols-3"
        )}
      >
        {images.map((image) => (
          <motion.div
            key={image.id}
            className="relative aspect-square overflow-hidden rounded-lg group"
            whileHover={{ scale: 1.02 }}
          >
            <img
              src={image.url}
              alt={image.alt || "Gallery image"}
              className="w-full h-full object-cover"
            />
            {image.caption && (
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <p className="text-xs text-white">{image.caption}</p>
              </div>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// Checklist Mode Component
function ChecklistMode({
  items,
  onToggle,
  isEmpty,
  renderEmpty,
}: {
  items: ChecklistItem[];
  onToggle: (id: string) => void;
  isEmpty: boolean;
  renderEmpty: () => React.ReactElement;
}) {
  if (isEmpty) return renderEmpty();

  const completedCount = items.filter((item) => item.completed).length;
  const progress = (completedCount / items.length) * 100;

  return (
    <div className="h-full w-full flex flex-col p-3 @sm:p-4">
      {/* Progress bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
          <span>Progress</span>
          <span>
            {completedCount}/{items.length}
          </span>
        </div>
        <div className="h-2 bg-secondary rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-primary"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      {/* Checklist items */}
      <div className="flex-1 overflow-y-auto space-y-2">
        {items.map((item) => (
          <motion.button
            key={item.id}
            onClick={() => onToggle(item.id)}
            className={cn(
              "flex items-start gap-3 p-2.5 rounded-lg w-full text-left",
              "bg-secondary/30 hover:bg-secondary/50",
              "border border-border/50 hover:border-border",
              "transition-all duration-200"
            )}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
          >
            <div
              className={cn(
                "flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center mt-0.5",
                item.completed
                  ? "bg-primary border-primary"
                  : "border-muted-foreground/30"
              )}
            >
              {item.completed && <Check className="w-3 h-3 text-primary-foreground" />}
            </div>
            <span
              className={cn(
                "flex-1 text-sm",
                item.completed && "line-through text-muted-foreground"
              )}
            >
              {item.text}
            </span>
          </motion.button>
        ))}
      </div>
    </div>
  );
}

// Configuration Panel Component
function ConfigurationPanel({
  widget,
  mode,
  onModeChange,
  onClose,
  updateConfig,
}: {
  widget: Widget;
  mode: CustomMode;
  onModeChange: (mode: CustomMode) => void;
  onClose: () => void;
  updateConfig: (updates: Record<string, unknown>) => void;
}) {
  const [localMode, setLocalMode] = useState(mode);
  const [localBg, setLocalBg] = useState(widget.config?.customBackground || "");
  const [localTextColor, setLocalTextColor] = useState(
    widget.config?.customTextColor || ""
  );
  const [localGradient, setLocalGradient] = useState(widget.config?.customGradient || "");

  // Links state
  const [links, setLinks] = useState<CustomLink[]>(
    (widget.config?.customLinks || []) as CustomLink[]
  );
  const [newLinkTitle, setNewLinkTitle] = useState("");
  const [newLinkUrl, setNewLinkUrl] = useState("");

  // Text state
  const [textContent, setTextContent] = useState(widget.config?.customText || "");

  // Countdown state
  const [countdownDate, setCountdownDate] = useState(widget.config?.countdownDate || "");
  const [countdownTitle, setCountdownTitle] = useState(
    widget.config?.countdownTitle || "Countdown"
  );
  const [countdownShowTime, setCountdownShowTime] = useState(
    widget.config?.countdownShowTime ?? true
  );

  // Embed state
  const [embedUrl, setEmbedUrl] = useState(widget.config?.embedUrl || "");
  const [embedHeight, setEmbedHeight] = useState(widget.config?.embedHeight || "400px");

  // Gallery state
  const [galleryImages, setGalleryImages] = useState<GalleryImage[]>(
    (widget.config?.galleryImages || []) as GalleryImage[]
  );
  const [galleryLayout, setGalleryLayout] = useState<"grid" | "masonry" | "carousel">(
    (widget.config?.galleryLayout as "grid" | "masonry" | "carousel") || "grid"
  );
  const [newImageUrl, setNewImageUrl] = useState("");
  const [newImageCaption, setNewImageCaption] = useState("");

  // Checklist state
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>(
    (widget.config?.checklistItems || []) as ChecklistItem[]
  );
  const [newChecklistItem, setNewChecklistItem] = useState("");

  const handleSave = () => {
    const updates: Record<string, unknown> = {
      customMode: localMode,
      customBackground: localBg,
      customTextColor: localTextColor,
      customGradient: localGradient,
    };

    // Add mode-specific data
    if (localMode === "links") {
      updates.customLinks = links;
    } else if (localMode === "text") {
      updates.customText = textContent;
    } else if (localMode === "countdown") {
      updates.countdownDate = countdownDate;
      updates.countdownTitle = countdownTitle;
      updates.countdownShowTime = countdownShowTime;
    } else if (localMode === "embed") {
      updates.embedUrl = embedUrl;
      updates.embedHeight = embedHeight;
    } else if (localMode === "gallery") {
      updates.galleryImages = galleryImages;
      updates.galleryLayout = galleryLayout;
    } else if (localMode === "checklist") {
      updates.checklistItems = checklistItems;
    }

    updateConfig(updates);
    onModeChange(localMode);
    onClose();
  };

  const addLink = () => {
    if (!newLinkTitle || !newLinkUrl) return;
    setLinks([
      ...links,
      {
        id: `link-${Date.now()}`,
        title: newLinkTitle,
        url: newLinkUrl,
      },
    ]);
    setNewLinkTitle("");
    setNewLinkUrl("");
  };

  const removeLink = (id: string) => {
    setLinks(links.filter((link) => link.id !== id));
  };

  const addImage = () => {
    if (!newImageUrl) return;
    setGalleryImages([
      ...galleryImages,
      {
        id: `image-${Date.now()}`,
        url: newImageUrl,
        caption: newImageCaption,
      },
    ]);
    setNewImageUrl("");
    setNewImageCaption("");
  };

  const removeImage = (id: string) => {
    setGalleryImages(galleryImages.filter((img) => img.id !== id));
  };

  const addChecklistItem = () => {
    if (!newChecklistItem) return;
    setChecklistItems([
      ...checklistItems,
      {
        id: `item-${Date.now()}`,
        text: newChecklistItem,
        completed: false,
      },
    ]);
    setNewChecklistItem("");
  };

  const removeChecklistItem = (id: string) => {
    setChecklistItems(checklistItems.filter((item) => item.id !== id));
  };

  return (
    <div className="h-full w-full flex flex-col bg-background">
      {/* Header */}
      <div className="border-b p-4 flex items-center justify-between">
        <h3 className="font-semibold text-sm flex items-center gap-2">
          <Settings className="w-4 h-4" />
          Configure Custom Widget
        </h3>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Configuration Form */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Mode Selection */}
        <div className="space-y-2">
          <Label htmlFor="mode">Widget Mode</Label>
          <Select value={localMode} onValueChange={(v) => setLocalMode(v as CustomMode)}>
            <SelectTrigger id="mode">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MODE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Appearance */}
        <div className="space-y-3 pt-2 border-t">
          <h4 className="text-sm font-medium">Appearance</h4>
          <div className="space-y-2">
            <Label htmlFor="bg">Background Color</Label>
            <Input
              id="bg"
              value={localBg}
              onChange={(e) => setLocalBg(e.target.value)}
              placeholder="#ffffff or rgb(255,255,255)"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="gradient">Gradient (overrides background)</Label>
            <Input
              id="gradient"
              value={localGradient}
              onChange={(e) => setLocalGradient(e.target.value)}
              placeholder="linear-gradient(to right, #667eea, #764ba2)"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="textColor">Text Color</Label>
            <Input
              id="textColor"
              value={localTextColor}
              onChange={(e) => setLocalTextColor(e.target.value)}
              placeholder="#000000"
            />
          </div>
        </div>

        {/* Mode-specific configuration */}
        <div className="pt-2 border-t">
          {localMode === "links" && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium">Links</h4>
              <div className="space-y-2">
                <Input
                  value={newLinkTitle}
                  onChange={(e) => setNewLinkTitle(e.target.value)}
                  placeholder="Link title"
                />
                <Input
                  value={newLinkUrl}
                  onChange={(e) => setNewLinkUrl(e.target.value)}
                  placeholder="https://..."
                />
                <Button onClick={addLink} size="sm" className="w-full">
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Add Link
                </Button>
              </div>
              <div className="space-y-2">
                {links.map((link) => (
                  <div
                    key={link.id}
                    className="flex items-center gap-2 p-2 bg-secondary/30 rounded-lg"
                  >
                    <GripVertical className="w-4 h-4 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{link.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{link.url}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeLink(link.id)}
                      className="h-7 w-7 p-0"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {localMode === "text" && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium">Text Content</h4>
              <Textarea
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                placeholder="Enter HTML or plain text..."
                className="min-h-[200px] font-mono text-xs"
              />
              <p className="text-xs text-muted-foreground">
                Supports HTML tags for formatting
              </p>
            </div>
          )}

          {localMode === "countdown" && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium">Countdown Settings</h4>
              <div className="space-y-2">
                <Label htmlFor="countdown-title">Title</Label>
                <Input
                  id="countdown-title"
                  value={countdownTitle}
                  onChange={(e) => setCountdownTitle(e.target.value)}
                  placeholder="Countdown title"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="countdown-date">Target Date</Label>
                <Input
                  id="countdown-date"
                  type="datetime-local"
                  value={countdownDate}
                  onChange={(e) => setCountdownDate(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="show-time"
                  checked={countdownShowTime}
                  onChange={(e) => setCountdownShowTime(e.target.checked)}
                  className="rounded"
                />
                <Label htmlFor="show-time" className="cursor-pointer">
                  Show minutes and seconds
                </Label>
              </div>
            </div>
          )}

          {localMode === "embed" && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium">Embed Settings</h4>
              <div className="space-y-2">
                <Label htmlFor="embed-url">Embed URL</Label>
                <Input
                  id="embed-url"
                  value={embedUrl}
                  onChange={(e) => setEmbedUrl(e.target.value)}
                  placeholder="https://..."
                />
                <p className="text-xs text-muted-foreground">
                  Only safe domains: YouTube, Vimeo, Spotify, CodePen, etc.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="embed-height">Height</Label>
                <Input
                  id="embed-height"
                  value={embedHeight}
                  onChange={(e) => setEmbedHeight(e.target.value)}
                  placeholder="400px"
                />
              </div>
            </div>
          )}

          {localMode === "gallery" && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium">Image Gallery</h4>
              <div className="space-y-2">
                <Label htmlFor="gallery-layout">Layout</Label>
                <Select value={galleryLayout} onValueChange={(v) => setGalleryLayout(v as "grid" | "masonry" | "carousel")}>
                  <SelectTrigger id="gallery-layout">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="grid">Grid</SelectItem>
                    <SelectItem value="masonry">Masonry</SelectItem>
                    <SelectItem value="carousel">Carousel</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Input
                  value={newImageUrl}
                  onChange={(e) => setNewImageUrl(e.target.value)}
                  placeholder="Image URL"
                />
                <Input
                  value={newImageCaption}
                  onChange={(e) => setNewImageCaption(e.target.value)}
                  placeholder="Caption (optional)"
                />
                <Button onClick={addImage} size="sm" className="w-full">
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Add Image
                </Button>
              </div>
              <div className="space-y-2">
                {galleryImages.map((image) => (
                  <div
                    key={image.id}
                    className="flex items-center gap-2 p-2 bg-secondary/30 rounded-lg"
                  >
                    <img
                      src={image.url}
                      alt={image.alt || ""}
                      className="w-10 h-10 rounded object-cover"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs truncate">{image.url}</p>
                      {image.caption && (
                        <p className="text-xs text-muted-foreground truncate">
                          {image.caption}
                        </p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeImage(image.id)}
                      className="h-7 w-7 p-0"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {localMode === "checklist" && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium">Checklist Items</h4>
              <div className="space-y-2">
                <Input
                  value={newChecklistItem}
                  onChange={(e) => setNewChecklistItem(e.target.value)}
                  placeholder="New item..."
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addChecklistItem();
                    }
                  }}
                />
                <Button onClick={addChecklistItem} size="sm" className="w-full">
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Add Item
                </Button>
              </div>
              <div className="space-y-2">
                {checklistItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-2 p-2 bg-secondary/30 rounded-lg"
                  >
                    <GripVertical className="w-4 h-4 text-muted-foreground" />
                    <span className="flex-1 text-sm">{item.text}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeChecklistItem(item.id)}
                      className="h-7 w-7 p-0"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="border-t p-4 flex gap-2">
        <Button variant="outline" onClick={onClose} className="flex-1">
          Cancel
        </Button>
        <Button onClick={handleSave} className="flex-1">
          Save Changes
        </Button>
      </div>
    </div>
  );
}
