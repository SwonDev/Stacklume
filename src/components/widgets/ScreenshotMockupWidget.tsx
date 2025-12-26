"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import {
  Smartphone,
  Monitor,
  Laptop,
  Tablet,
  Download,
  Upload,
  RefreshCw,
  Link2,
  History,
  Image as ImageIcon,
  Check,
  X,
  Globe,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useWidgetStore } from "@/stores/widget-store";
import type { Widget } from "@/types/widget";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";

interface ScreenshotMockupWidgetProps {
  widget: Widget;
}

interface ScreenshotMockupConfig {
  recentScreenshots?: RecentScreenshot[];
  lastDevice?: DeviceType;
  lastColor?: string;
}

interface RecentScreenshot {
  id: string;
  url: string;
  device: DeviceType;
  createdAt: string;
}

type DeviceType = "iphone" | "ipad" | "macbook" | "browser" | "android";

interface DeviceFrame {
  id: DeviceType;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  aspectRatio: string;
  screenPadding: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  borderRadius: number;
  frameColor: string;
  hasNotch?: boolean;
  hasHomeIndicator?: boolean;
  hasDynamicIsland?: boolean;
}

// Device frame configurations
const DEVICE_FRAMES: Record<DeviceType, DeviceFrame> = {
  iphone: {
    id: "iphone",
    name: "iPhone 15 Pro",
    icon: Smartphone,
    aspectRatio: "9/19.5",
    screenPadding: { top: 8, right: 4, bottom: 8, left: 4 },
    borderRadius: 40,
    frameColor: "#1a1a1a",
    hasDynamicIsland: true,
    hasHomeIndicator: true,
  },
  android: {
    id: "android",
    name: "Android",
    icon: Smartphone,
    aspectRatio: "9/19",
    screenPadding: { top: 6, right: 4, bottom: 6, left: 4 },
    borderRadius: 24,
    frameColor: "#1a1a1a",
    hasNotch: false,
    hasHomeIndicator: false,
  },
  ipad: {
    id: "ipad",
    name: "iPad Pro",
    icon: Tablet,
    aspectRatio: "3/4",
    screenPadding: { top: 12, right: 12, bottom: 12, left: 12 },
    borderRadius: 24,
    frameColor: "#2a2a2a",
    hasHomeIndicator: true,
  },
  macbook: {
    id: "macbook",
    name: "MacBook Pro",
    icon: Laptop,
    aspectRatio: "16/10",
    screenPadding: { top: 16, right: 12, bottom: 40, left: 12 },
    borderRadius: 12,
    frameColor: "#3a3a3a",
  },
  browser: {
    id: "browser",
    name: "Navegador",
    icon: Globe,
    aspectRatio: "16/10",
    screenPadding: { top: 36, right: 2, bottom: 2, left: 2 },
    borderRadius: 8,
    frameColor: "#2a2a2a",
  },
};

const FRAME_COLORS = [
  { id: "black", name: "Negro", value: "#1a1a1a" },
  { id: "silver", name: "Plateado", value: "#d4d4d4" },
  { id: "gold", name: "Dorado", value: "#c9a962" },
  { id: "space-gray", name: "Gris Espacial", value: "#4a4a4a" },
  { id: "blue", name: "Azul", value: "#2563eb" },
  { id: "purple", name: "Morado", value: "#7c3aed" },
];

export function ScreenshotMockupWidget({ widget }: ScreenshotMockupWidgetProps) {
  const updateWidget = useWidgetStore((state) => state.updateWidget);
  const storeWidget = useWidgetStore(
    (state) => state.widgets.find((w) => w.id === widget.id)
  );

  const currentWidget = storeWidget || widget;
  const config = currentWidget.config as ScreenshotMockupConfig | undefined;

  const [imageUrl, setImageUrl] = useState("");
  const [loadedImage, setLoadedImage] = useState<string | null>(null);
  const [selectedDevice, setSelectedDevice] = useState<DeviceType>(
    config?.lastDevice || "iphone"
  );
  const [frameColor, setFrameColor] = useState(config?.lastColor || "#1a1a1a");
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"create" | "recent">("create");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const recentScreenshots = config?.recentScreenshots || [];
  const device = DEVICE_FRAMES[selectedDevice];

  // Save preferences
  useEffect(() => {
    updateWidget(currentWidget.id, {
      config: {
        ...currentWidget.config,
        lastDevice: selectedDevice,
        lastColor: frameColor,
      },
    });
  }, [selectedDevice, frameColor]);

  const loadImage = useCallback(async (url: string) => {
    if (!url.trim()) return;
    setIsLoading(true);
    try {
      // Validate URL
      new URL(url);
      setLoadedImage(url);
      addToRecent(url);
      toast.success("Imagen cargada");
    } catch (_error) {
      toast.error("URL invalida");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        setLoadedImage(dataUrl);
        toast.success("Imagen cargada");
      };
      reader.readAsDataURL(file);
    }
  };

  const addToRecent = (url: string) => {
    const newRecent: RecentScreenshot = {
      id: Date.now().toString(),
      url,
      device: selectedDevice,
      createdAt: new Date().toISOString(),
    };

    const updatedRecent = [
      newRecent,
      ...recentScreenshots.filter((r) => r.url !== url),
    ].slice(0, 10);

    updateWidget(currentWidget.id, {
      config: {
        ...currentWidget.config,
        recentScreenshots: updatedRecent,
      },
    });
  };

  const downloadMockup = useCallback(async () => {
    if (!loadedImage || !canvasRef.current) {
      toast.error("No hay imagen para descargar");
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas size
    const width = 800;
    const height = Math.round(width / parseFloat(device.aspectRatio.replace("/", "*")));
    canvas.width = width;
    canvas.height = height;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Draw frame
    ctx.fillStyle = frameColor;
    ctx.beginPath();
    ctx.roundRect(0, 0, width, height, device.borderRadius);
    ctx.fill();

    // Calculate screen area
    const screenX = device.screenPadding.left * 3;
    const screenY = device.screenPadding.top * 3;
    const screenWidth = width - (device.screenPadding.left + device.screenPadding.right) * 3;
    const screenHeight = height - (device.screenPadding.top + device.screenPadding.bottom) * 3;

    // Draw screen background
    ctx.fillStyle = "#000";
    ctx.beginPath();
    ctx.roundRect(screenX, screenY, screenWidth, screenHeight, device.borderRadius - 8);
    ctx.fill();

    // Load and draw image
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      // Calculate image scaling to cover screen area
      const imgAspect = img.width / img.height;
      const screenAspect = screenWidth / screenHeight;

      let drawWidth = screenWidth;
      let drawHeight = screenHeight;
      let offsetX = 0;
      let offsetY = 0;

      if (imgAspect > screenAspect) {
        drawHeight = screenHeight;
        drawWidth = drawHeight * imgAspect;
        offsetX = (screenWidth - drawWidth) / 2;
      } else {
        drawWidth = screenWidth;
        drawHeight = drawWidth / imgAspect;
        offsetY = (screenHeight - drawHeight) / 2;
      }

      // Clip to screen area
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(screenX, screenY, screenWidth, screenHeight, device.borderRadius - 8);
      ctx.clip();
      ctx.drawImage(
        img,
        screenX + offsetX,
        screenY + offsetY,
        drawWidth,
        drawHeight
      );
      ctx.restore();

      // Draw Dynamic Island for iPhone
      if (device.hasDynamicIsland) {
        const islandWidth = 120;
        const islandHeight = 36;
        const islandX = (width - islandWidth) / 2;
        const islandY = screenY + 12;

        ctx.fillStyle = "#000";
        ctx.beginPath();
        ctx.roundRect(islandX, islandY, islandWidth, islandHeight, 18);
        ctx.fill();
      }

      // Draw home indicator for mobile devices
      if (device.hasHomeIndicator) {
        const indicatorWidth = 130;
        const indicatorHeight = 5;
        const indicatorX = (width - indicatorWidth) / 2;
        const indicatorY = height - device.screenPadding.bottom * 3 - 20;

        ctx.fillStyle = "rgba(255,255,255,0.3)";
        ctx.beginPath();
        ctx.roundRect(indicatorX, indicatorY, indicatorWidth, indicatorHeight, 3);
        ctx.fill();
      }

      // Draw browser chrome
      if (device.id === "browser") {
        const chromeHeight = 32;
        const chromeY = screenY;

        // Browser bar background
        ctx.fillStyle = "#3a3a3a";
        ctx.fillRect(screenX, chromeY - chromeHeight, screenWidth, chromeHeight);

        // Traffic lights
        const dotRadius = 6;
        const dotY = chromeY - chromeHeight / 2;
        const dotSpacing = 20;
        const startX = screenX + 16;

        ctx.fillStyle = "#ff5f57";
        ctx.beginPath();
        ctx.arc(startX, dotY, dotRadius, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "#febc2e";
        ctx.beginPath();
        ctx.arc(startX + dotSpacing, dotY, dotRadius, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "#28c840";
        ctx.beginPath();
        ctx.arc(startX + dotSpacing * 2, dotY, dotRadius, 0, Math.PI * 2);
        ctx.fill();

        // URL bar
        const urlBarWidth = screenWidth * 0.5;
        const urlBarHeight = 20;
        const urlBarX = (screenWidth - urlBarWidth) / 2 + screenX;
        const urlBarY = chromeY - chromeHeight / 2 - urlBarHeight / 2;

        ctx.fillStyle = "#4a4a4a";
        ctx.beginPath();
        ctx.roundRect(urlBarX, urlBarY, urlBarWidth, urlBarHeight, 4);
        ctx.fill();
      }

      // Download
      const dataUrl = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.download = `mockup-${device.id}-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
      toast.success("Mockup descargado");
    };

    img.onerror = () => {
      toast.error("Error al cargar la imagen");
    };

    img.src = loadedImage;
  }, [loadedImage, device, frameColor]);

  const clearImage = () => {
    setLoadedImage(null);
    setImageUrl("");
  };

  const loadRecent = (screenshot: RecentScreenshot) => {
    setLoadedImage(screenshot.url);
    setSelectedDevice(screenshot.device);
    setActiveTab("create");
    toast.success("Captura cargada");
  };

  return (
    <div className="h-full w-full flex flex-col @container">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-6 h-6 rounded-md bg-primary/10">
            <Monitor className="w-3.5 h-3.5 text-primary" />
          </div>
          <h3 className="text-xs font-semibold">Mockup</h3>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="flex-1 flex flex-col overflow-hidden">
        <TabsList className="grid w-full grid-cols-2 h-7 mb-2">
          <TabsTrigger value="create" className="text-[10px]">
            <ImageIcon className="w-3 h-3 mr-1" />
            Crear
          </TabsTrigger>
          <TabsTrigger value="recent" className="text-[10px]">
            <History className="w-3 h-3 mr-1" />
            Recientes
          </TabsTrigger>
        </TabsList>

        <TabsContent value="create" className="flex-1 overflow-hidden flex flex-col mt-0">
          {/* Image input */}
          <div className="space-y-2 mb-2">
            <div className="flex gap-1">
              <Input
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="URL de la imagen..."
                className="h-7 text-xs flex-1"
              />
              <Button
                size="sm"
                variant="outline"
                className="h-7 px-2"
                onClick={() => loadImage(imageUrl)}
                disabled={isLoading || !imageUrl.trim()}
              >
                {isLoading ? (
                  <RefreshCw className="w-3 h-3 animate-spin" />
                ) : (
                  <Link2 className="w-3 h-3" />
                )}
              </Button>
            </div>

            <div className="flex gap-1">
              <Button
                size="sm"
                variant="outline"
                className="flex-1 h-7 text-xs"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="w-3 h-3 mr-1" />
                Subir imagen
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileUpload}
              />
              {loadedImage && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2"
                  onClick={clearImage}
                >
                  <X className="w-3 h-3" />
                </Button>
              )}
            </div>
          </div>

          {/* Device and color selection */}
          <div className="grid grid-cols-2 gap-2 mb-2">
            <div>
              <Label className="text-[10px] text-muted-foreground mb-1 block">
                Dispositivo
              </Label>
              <Select value={selectedDevice} onValueChange={(v) => setSelectedDevice(v as DeviceType)}>
                <SelectTrigger className="h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(DEVICE_FRAMES).map((d) => {
                    const Icon = d.icon;
                    return (
                      <SelectItem key={d.id} value={d.id} className="text-xs">
                        <div className="flex items-center gap-1.5">
                          <Icon className="w-3 h-3" />
                          {d.name}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-[10px] text-muted-foreground mb-1 block">
                Color
              </Label>
              <Select value={frameColor} onValueChange={setFrameColor}>
                <SelectTrigger className="h-7 text-xs">
                  <div className="flex items-center gap-1.5">
                    <div
                      className="w-3 h-3 rounded-full border border-border"
                      style={{ backgroundColor: frameColor }}
                    />
                    <SelectValue />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {FRAME_COLORS.map((c) => (
                    <SelectItem key={c.id} value={c.value} className="text-xs">
                      <div className="flex items-center gap-1.5">
                        <div
                          className="w-3 h-3 rounded-full border border-border"
                          style={{ backgroundColor: c.value }}
                        />
                        {c.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Preview */}
          <div className="flex-1 min-h-0 flex items-center justify-center bg-secondary/30 rounded-lg p-2 mb-2 overflow-hidden">
            <AnimatePresence mode="wait">
              {loadedImage ? (
                <motion.div
                  key="preview"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="relative max-w-full max-h-full"
                  style={{
                    aspectRatio: device.aspectRatio,
                    maxHeight: "100%",
                  }}
                >
                  {/* Device frame */}
                  <div
                    className="w-full h-full relative shadow-lg"
                    style={{
                      backgroundColor: frameColor,
                      borderRadius: `${device.borderRadius / 4}px`,
                      padding: `${device.screenPadding.top}px ${device.screenPadding.right}px ${device.screenPadding.bottom}px ${device.screenPadding.left}px`,
                    }}
                  >
                    {/* Screen */}
                    <div
                      className="w-full h-full overflow-hidden relative bg-black"
                      style={{
                        borderRadius: `${(device.borderRadius - 8) / 4}px`,
                      }}
                    >
                      {/* Browser chrome */}
                      {device.id === "browser" && (
                        <div className="h-6 bg-[#3a3a3a] flex items-center px-2 gap-1.5">
                          <div className="w-2 h-2 rounded-full bg-[#ff5f57]" />
                          <div className="w-2 h-2 rounded-full bg-[#febc2e]" />
                          <div className="w-2 h-2 rounded-full bg-[#28c840]" />
                          <div className="flex-1 mx-4">
                            <div className="h-3 bg-[#4a4a4a] rounded-sm" />
                          </div>
                        </div>
                      )}

                      {/* Dynamic Island */}
                      {device.hasDynamicIsland && (
                        <div className="absolute top-1 left-1/2 -translate-x-1/2 w-16 h-4 bg-black rounded-full z-10" />
                      )}

                      {/* Image */}
                      <img
                        src={loadedImage}
                        alt="Screenshot preview"
                        className="w-full h-full object-cover"
                      />

                      {/* Home indicator */}
                      {device.hasHomeIndicator && (
                        <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-12 h-1 bg-white/30 rounded-full" />
                      )}
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="placeholder"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center justify-center text-center"
                >
                  <ImageIcon className="w-8 h-8 text-muted-foreground/50 mb-2" />
                  <p className="text-xs text-muted-foreground">Sin imagen</p>
                  <p className="text-[10px] text-muted-foreground/60">
                    Sube o pega una URL
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Download button */}
          <Button
            size="sm"
            className="w-full h-8 text-xs"
            onClick={downloadMockup}
            disabled={!loadedImage}
          >
            <Download className="w-3.5 h-3.5 mr-1.5" />
            Descargar Mockup
          </Button>

          {/* Hidden canvas for export */}
          <canvas ref={canvasRef} className="hidden" />
        </TabsContent>

        <TabsContent value="recent" className="flex-1 overflow-hidden mt-0">
          {recentScreenshots.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <History className="w-8 h-8 text-muted-foreground/50 mb-2" />
              <p className="text-xs text-muted-foreground">Sin capturas recientes</p>
              <p className="text-[10px] text-muted-foreground/60 mt-1">
                Las imagenes usadas apareceran aqui
              </p>
            </div>
          ) : (
            <ScrollArea className="h-full">
              <div className="grid grid-cols-2 gap-2">
                {recentScreenshots.map((screenshot) => {
                  const DeviceIcon = DEVICE_FRAMES[screenshot.device].icon;
                  return (
                    <button
                      key={screenshot.id}
                      className="relative aspect-video rounded-md overflow-hidden group border border-border"
                      onClick={() => loadRecent(screenshot)}
                    >
                      <img
                        src={screenshot.url}
                        alt="Recent screenshot"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                        <DeviceIcon className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <div className="absolute bottom-1 right-1">
                        <DeviceIcon className="w-3 h-3 text-white/70" />
                      </div>
                    </button>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
