"use client";

import { useState, useRef } from "react";
import { QrCode, Settings, Download, Copy, Check, Link, Bookmark, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useWidgetStore } from "@/stores/widget-store";
import { useLinksStore } from "@/stores/links-store";
import type { Widget } from "@/types/widget";
import { toast } from "sonner";
import { useTranslation } from "@/lib/i18n";

interface QRCodeWidgetProps {
  widget: Widget;
}

interface QRCodeConfig {
  content?: string;
  size?: number;
  fgColor?: string;
  bgColor?: string;
  errorCorrectionLevel?: "L" | "M" | "Q" | "H";
}

// Check if content is a URL
function isValidUrl(string: string): boolean {
  try {
    const url = new URL(string);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

// QR Code generation using a free API
function generateQRCodeUrl(content: string, config: QRCodeConfig): string {
  const size = config.size || 200;
  const fgColor = (config.fgColor || "#000000").replace("#", "");
  const bgColor = (config.bgColor || "#FFFFFF").replace("#", "");

  // Using QR Server API (free, no API key required)
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(content)}&color=${fgColor}&bgcolor=${bgColor}&ecc=${config.errorCorrectionLevel || "M"}`;
}

export function QRCodeWidget({ widget }: QRCodeWidgetProps) {
  const { t } = useTranslation();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const _canvasRef = useRef<HTMLCanvasElement>(null);

  const handleSaveAsLink = () => {
    const config = widget.config as QRCodeConfig | undefined;
    if (config?.content && isValidUrl(config.content)) {
      useLinksStore.getState().openAddLinkModal({
        url: config.content,
        title: t("qrCode.linkTitle"),
        description: t("qrCode.linkDescription"),
      });
      toast.success(t("qrCode.openingForm"));
    }
  };

  const config = widget.config as QRCodeConfig | undefined;
  const content = config?.content || "";
  const size = config?.size || 200;
  const fgColor = config?.fgColor || "#000000";
  const bgColor = config?.bgColor || "#FFFFFF";
  const errorCorrectionLevel = config?.errorCorrectionLevel || "M";

  const [formData, setFormData] = useState<QRCodeConfig>({
    content,
    size,
    fgColor,
    bgColor,
    errorCorrectionLevel,
  });

  const handleSave = () => {
    useWidgetStore.getState().updateWidget(widget.id, {
      config: {
        ...widget.config,
        ...formData,
      },
    });
    setIsSettingsOpen(false);
  };

  const copyToClipboard = async () => {
    if (content) {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const downloadQRCode = async () => {
    if (!content) return;

    const qrUrl = generateQRCodeUrl(content, { size: 512, fgColor, bgColor, errorCorrectionLevel });

    try {
      const response = await fetch(qrUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `qrcode-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading QR code:", error);
    }
  };

  // Settings dialog content (shared between empty state and main view)
  const settingsDialog = (
    <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
      <DialogContent className="sm:max-w-md glass">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="w-5 h-5 text-primary" />
            {t("qrCode.configureTitle")}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="qr-content">{t("qrCode.urlOrText")}</Label>
            <Textarea
              id="qr-content"
              placeholder={t("qrCode.urlOrTextPlaceholder")}
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t("qrCode.qrColor")}</Label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={formData.fgColor}
                  onChange={(e) => setFormData({ ...formData, fgColor: e.target.value })}
                  className="w-10 h-10 rounded cursor-pointer border-0"
                />
                <Input
                  value={formData.fgColor}
                  onChange={(e) => setFormData({ ...formData, fgColor: e.target.value })}
                  className="font-mono text-xs"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>{t("qrCode.bgColor")}</Label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={formData.bgColor}
                  onChange={(e) => setFormData({ ...formData, bgColor: e.target.value })}
                  className="w-10 h-10 rounded cursor-pointer border-0"
                />
                <Input
                  value={formData.bgColor}
                  onChange={(e) => setFormData({ ...formData, bgColor: e.target.value })}
                  className="font-mono text-xs"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t("qrCode.errorCorrection")}</Label>
            <Select
              value={formData.errorCorrectionLevel}
              onValueChange={(value: "L" | "M" | "Q" | "H") =>
                setFormData({ ...formData, errorCorrectionLevel: value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder={t("qrCode.errorCorrectionPlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="L">{t("qrCode.errorLow")}</SelectItem>
                <SelectItem value="M">{t("qrCode.errorMedium")}</SelectItem>
                <SelectItem value="Q">{t("qrCode.errorQuartile")}</SelectItem>
                <SelectItem value="H">{t("qrCode.errorHigh")}</SelectItem>
              </SelectContent>
            </Select>
            {!content && (
              <p className="text-xs text-muted-foreground">
                {t("qrCode.errorCorrectionHint")}
              </p>
            )}
          </div>

          {/* Preview */}
          {formData.content && (
            <div className="flex justify-center pt-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={generateQRCodeUrl(formData.content, {
                  size: 150,
                  fgColor: formData.fgColor,
                  bgColor: formData.bgColor,
                  errorCorrectionLevel: formData.errorCorrectionLevel,
                })}
                alt="QR Preview"
                className="rounded-lg shadow-sm"
              />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setIsSettingsOpen(false)}>
            {t("qrCode.cancel")}
          </Button>
          <Button onClick={handleSave} disabled={!formData.content?.trim()}>
            {t("qrCode.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  // Empty state
  if (!content) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-6 text-center px-4">
        <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center mb-3">
          <QrCode className="w-6 h-6 text-primary" />
        </div>
        <p className="text-sm text-muted-foreground mb-1">{t("qrCode.noContent")}</p>
        <p className="text-xs text-muted-foreground/60 mb-4">
          {t("qrCode.noContentDesc")}
        </p>
        <Button size="sm" onClick={() => setIsSettingsOpen(true)}>
          <Settings className="w-4 h-4 mr-2" />
          {t("qrCode.configure")}
        </Button>

        {settingsDialog}
      </div>
    );
  }

  const qrUrl = generateQRCodeUrl(content, { size: 400, fgColor, bgColor, errorCorrectionLevel });

  return (
    <div className="h-full w-full flex flex-col overflow-hidden">
      {/* QR Code Display */}
      <div className="flex-1 flex items-center justify-center p-3 min-h-0">
        <div className="relative group w-full h-full flex items-center justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={qrUrl}
            alt="QR Code"
            className="max-w-full max-h-full object-contain rounded-lg shadow-sm"
          />

          {/* Overlay actions */}
          <div className="absolute inset-0 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/20 rounded-lg z-10">
            {isValidUrl(content) && (
              <>
                <Button
                  size="icon"
                  variant="secondary"
                  className="h-8 w-8"
                  onClick={handleSaveAsLink}
                  title={t("qrCode.saveAsLink")}
                >
                  <Bookmark className="w-4 h-4" />
                </Button>
                <Button
                  size="icon"
                  variant="secondary"
                  className="h-8 w-8"
                  asChild
                  title={t("qrCode.openLink")}
                >
                  <a href={content} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </Button>
              </>
            )}
            <Button
              size="icon"
              variant="secondary"
              className="h-8 w-8"
              onClick={downloadQRCode}
              title={t("qrCode.download")}
            >
              <Download className="w-4 h-4" />
            </Button>
            <Button
              size="icon"
              variant="secondary"
              className="h-8 w-8"
              onClick={copyToClipboard}
              title={t("qrCode.copyContent")}
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </Button>
            <Button
              size="icon"
              variant="secondary"
              className="h-8 w-8"
              onClick={() => setIsSettingsOpen(true)}
              title={t("qrCode.configure")}
            >
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Content preview */}
      <div className="px-2 pb-2">
        <div className="flex items-center gap-1 text-xs text-muted-foreground bg-secondary/50 rounded px-2 py-1">
          <Link className="w-3 h-3 flex-shrink-0" />
          <span className="truncate">{content}</span>
        </div>
      </div>

      {settingsDialog}
    </div>
  );
}
