"use client";

import { useState } from "react";
import { Image as ImageIcon, ExternalLink, Settings2, Link as LinkIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useWidgetStore } from "@/stores/widget-store";
import { motion, AnimatePresence } from "motion/react";
import type { Widget } from "@/types/widget";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTranslation } from "@/lib/i18n";

interface ImageWidgetProps {
  widget: Widget;
}

type ObjectFit = "cover" | "contain" | "fill" | "none" | "scale-down";

export function ImageWidget({ widget }: ImageWidgetProps) {
  const { t } = useTranslation();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [imageError, setImageError] = useState(false);

  // Get configuration
  const imageUrl = (widget.config?.imageUrl as string) || "";
  const linkUrl = (widget.config?.linkUrl as string) || "";
  const caption = (widget.config?.caption as string) || "";
  const objectFit = (widget.config?.objectFit as ObjectFit) || "cover";
  const showCaption = (widget.config?.showCaption as boolean) ?? true;

  // Settings form state
  const [settingsForm, setSettingsForm] = useState({
    imageUrl,
    linkUrl,
    caption,
    objectFit,
    showCaption,
  });

  const handleImageClick = () => {
    if (linkUrl) {
      window.open(linkUrl, "_blank", "noopener,noreferrer");
    }
  };

  const handleSaveSettings = () => {
    useWidgetStore.getState().updateWidget(widget.id, {
      config: {
        ...widget.config,
        imageUrl: settingsForm.imageUrl,
        linkUrl: settingsForm.linkUrl,
        caption: settingsForm.caption,
        objectFit: settingsForm.objectFit,
        showCaption: settingsForm.showCaption,
      },
    });
    setImageError(false);
    setIsSettingsOpen(false);
  };

  const handleImageError = () => {
    setImageError(true);
  };

  const objectFitClasses: Record<ObjectFit, string> = {
    cover: "object-cover",
    contain: "object-contain",
    fill: "object-fill",
    none: "object-none",
    "scale-down": "object-scale-down",
  };

  const hasImage = imageUrl && !imageError;
  const isClickable = hasImage && linkUrl;

  return (
    <>
      <div className="@container h-full w-full relative group">
        {/* Settings Button - Always visible on hover */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setIsSettingsOpen(true)}
            className="h-8 w-8 p-0 shadow-lg bg-background/80 backdrop-blur-sm hover:bg-background/95"
          >
            <Settings2 className="w-3.5 h-3.5" />
          </Button>
        </motion.div>

        <AnimatePresence mode="wait">
          {!hasImage ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center h-full text-center px-4 py-8"
            >
              <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-4 @md:w-16 @md:h-16">
                <ImageIcon className="w-6 h-6 text-primary @md:w-8 @md:h-8" />
              </div>
              <h3 className="text-sm font-medium text-foreground mb-1 @sm:text-base">
                {t("image.noImage")}
              </h3>
              <p className="text-xs text-muted-foreground mb-4 max-w-[200px] @sm:text-sm @sm:max-w-[250px]">
                {t("image.configureHint")}
              </p>
              <Button
                size="sm"
                onClick={() => setIsSettingsOpen(true)}
                className="h-8 text-xs @sm:h-9 @sm:text-sm"
              >
                <Settings2 className="w-3.5 h-3.5 mr-1.5" />
                {t("image.configureImage")}
              </Button>
            </motion.div>
          ) : (
            <motion.div
              key="image"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className={`h-full w-full flex flex-col ${isClickable ? "cursor-pointer" : ""}`}
              onClick={isClickable ? handleImageClick : undefined}
            >
              {/* Image Container */}
              <div className="relative flex-1 min-h-0 bg-muted/20 overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imageUrl}
                  alt={caption || "Widget image"}
                  className={`w-full h-full ${objectFitClasses[objectFit]} transition-transform duration-300 ${
                    isClickable ? "group-hover:scale-105" : ""
                  }`}
                  onError={handleImageError}
                />

                {/* Link Indicator Overlay */}
                {isClickable && (
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      whileHover={{ opacity: 1, scale: 1 }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity bg-background/90 backdrop-blur-sm rounded-full p-3 shadow-lg"
                    >
                      <ExternalLink className="w-5 h-5 @md:w-6 @md:h-6 text-foreground" />
                    </motion.div>
                  </div>
                )}

                {/* Caption Overlay - Bottom */}
                {showCaption && caption && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent p-3 @sm:p-4 @md:p-5"
                  >
                    <p className="text-white text-xs @sm:text-sm @md:text-base font-medium line-clamp-2 drop-shadow-lg">
                      {caption}
                    </p>
                    {linkUrl && (
                      <div className="flex items-center gap-1.5 mt-1 opacity-80">
                        <LinkIcon className="w-3 h-3 text-white" />
                        <p className="text-xs text-white/90 truncate">
                          {new URL(linkUrl).hostname}
                        </p>
                      </div>
                    )}
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Settings Dialog */}
      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-lg max-h-[90vh] overflow-y-auto scrollbar-thin">
          <DialogHeader>
            <DialogTitle>{t("image.configureImage")}</DialogTitle>
            <DialogDescription>
              {t("image.customizeOptions")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Image URL */}
            <div className="space-y-2">
              <Label htmlFor="image-url">{t("image.imageUrl")}</Label>
              <Input
                id="image-url"
                type="url"
                placeholder="https://ejemplo.com/imagen.jpg"
                value={settingsForm.imageUrl}
                onChange={(e) =>
                  setSettingsForm({ ...settingsForm, imageUrl: e.target.value })
                }
              />
              <p className="text-xs text-muted-foreground">
                {t("image.imageUrlHint")}
              </p>
            </div>

            {/* Link URL */}
            <div className="space-y-2">
              <Label htmlFor="link-url">{t("image.linkUrl")}</Label>
              <Input
                id="link-url"
                type="url"
                placeholder="https://ejemplo.com"
                value={settingsForm.linkUrl}
                onChange={(e) =>
                  setSettingsForm({ ...settingsForm, linkUrl: e.target.value })
                }
              />
              <p className="text-xs text-muted-foreground">
                {t("image.linkUrlHint")}
              </p>
            </div>

            {/* Caption */}
            <div className="space-y-2">
              <Label htmlFor="caption">{t("image.caption")}</Label>
              <Input
                id="caption"
                type="text"
                placeholder={t("image.captionPlaceholder")}
                value={settingsForm.caption}
                onChange={(e) =>
                  setSettingsForm({ ...settingsForm, caption: e.target.value })
                }
              />
              <p className="text-xs text-muted-foreground">
                {t("image.captionHint")}
              </p>
            </div>

            {/* Object Fit */}
            <div className="space-y-2">
              <Label htmlFor="object-fit">{t("image.objectFit")}</Label>
              <Select
                value={settingsForm.objectFit}
                onValueChange={(value: ObjectFit) =>
                  setSettingsForm({ ...settingsForm, objectFit: value })
                }
              >
                <SelectTrigger id="object-fit">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cover">
                    {t("image.fitCover")}
                  </SelectItem>
                  <SelectItem value="contain">
                    {t("image.fitContain")}
                  </SelectItem>
                  <SelectItem value="fill">
                    {t("image.fitFill")}
                  </SelectItem>
                  <SelectItem value="scale-down">
                    {t("image.fitScaleDown")}
                  </SelectItem>
                  <SelectItem value="none">
                    {t("image.fitNone")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Show Caption Toggle */}
            <div className="flex items-center gap-2">
              <input
                id="show-caption"
                type="checkbox"
                checked={settingsForm.showCaption}
                onChange={(e) =>
                  setSettingsForm({
                    ...settingsForm,
                    showCaption: e.target.checked,
                  })
                }
                className="h-4 w-4 rounded border-input"
              />
              <Label htmlFor="show-caption" className="font-normal cursor-pointer">
                {t("image.showCaption")}
              </Label>
            </div>

            {/* Preview */}
            {settingsForm.imageUrl && (
              <div className="space-y-2">
                <Label>{t("image.preview")}</Label>
                <div className="relative w-full h-32 rounded-lg border bg-muted overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={settingsForm.imageUrl}
                    alt="Preview"
                    className={`w-full h-full ${
                      objectFitClasses[settingsForm.objectFit]
                    }`}
                    onError={(e) => {
                      e.currentTarget.src = "";
                      e.currentTarget.style.display = "none";
                    }}
                  />
                  {settingsForm.showCaption && settingsForm.caption && (
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                      <p className="text-white text-xs line-clamp-1">
                        {settingsForm.caption}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setIsSettingsOpen(false)}
            >
              {t("image.cancel")}
            </Button>
            <Button onClick={handleSaveSettings}>
              {t("image.saveChanges")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
