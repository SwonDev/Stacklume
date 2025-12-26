"use client";

import { useState } from "react";
import { Code2, Settings, ExternalLink, Loader2, AlertCircle, Bookmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Switch } from "@/components/ui/switch";
import { useWidgetStore } from "@/stores/widget-store";
import { useLinksStore } from "@/stores/links-store";
import type { Widget } from "@/types/widget";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface CodePenWidgetProps {
  widget: Widget;
}

type CodePenTheme = "light" | "dark" | "default";
type CodePenTab = "html" | "css" | "js" | "result";

interface CodePenConfig {
  penUrl?: string;
  penId?: string;
  penUser?: string;
  theme?: CodePenTheme;
  defaultTab?: CodePenTab;
  height?: number;
  editable?: boolean;
  showResult?: boolean;
}

function extractPenInfo(url: string): { user: string; penId: string } | null {
  // Patterns to match:
  // https://codepen.io/username/pen/penId
  // https://codepen.io/username/full/penId
  // https://codepen.io/username/details/penId
  // codepen.io/username/pen/penId
  const patterns = [
    /codepen\.io\/([^\/]+)\/(?:pen|full|details)\/([a-zA-Z0-9]+)/,
    /codepen\.io\/([^\/]+)\/embed\/([a-zA-Z0-9]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return { user: match[1], penId: match[2] };
    }
  }
  return null;
}

function buildEmbedUrl(
  user: string,
  penId: string,
  config: CodePenConfig
): string {
  const params = new URLSearchParams();

  // Default tab
  if (config.defaultTab) {
    params.set("default-tab", config.showResult ? `${config.defaultTab},result` : config.defaultTab);
  } else {
    params.set("default-tab", config.showResult !== false ? "result" : "html");
  }

  // Theme
  params.set("theme-id", config.theme || "dark");

  // Editable
  if (config.editable) {
    params.set("editable", "true");
  }

  return `https://codepen.io/${user}/embed/${penId}?${params.toString()}`;
}

export function CodePenWidget({ widget }: CodePenWidgetProps) {
  const { updateWidget } = useWidgetStore();
  const { openAddLinkModal } = useLinksStore();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const handleSaveAsLink = () => {
    const config = widget.config as CodePenConfig | undefined;
    if (config?.penUrl) {
      const penInfo = extractPenInfo(config.penUrl);
      openAddLinkModal({
        url: config.penUrl,
        title: penInfo ? `CodePen by ${penInfo.user}` : "CodePen Snippet",
        description: "Snippet de código de CodePen",
      });
      toast.success("Abriendo formulario para guardar enlace");
    }
  };

  // Form state
  const [formData, setFormData] = useState<CodePenConfig>({
    penUrl: widget.config?.penUrl || "",
    theme: widget.config?.codepenTheme || "dark",
    defaultTab: widget.config?.defaultTab || "result",
    height: widget.config?.height || 400,
    editable: widget.config?.editable || false,
    showResult: widget.config?.showResult !== false,
  });

  const config = widget.config as CodePenConfig | undefined;
  const penInfo = config?.penUrl ? extractPenInfo(config.penUrl) : null;

  const handleSave = () => {
    const newPenInfo = formData.penUrl ? extractPenInfo(formData.penUrl) : null;

    updateWidget(widget.id, {
      config: {
        ...widget.config,
        penUrl: formData.penUrl,
        codepenTheme: formData.theme,
        defaultTab: formData.defaultTab,
        height: formData.height,
        editable: formData.editable,
        showResult: formData.showResult,
        penId: newPenInfo?.penId,
        penUser: newPenInfo?.user,
      },
    });
    setIsSettingsOpen(false);
    setIsLoading(true);
    setHasError(false);
  };

  const handleIframeLoad = () => {
    setIsLoading(false);
  };

  const handleIframeError = () => {
    setIsLoading(false);
    setHasError(true);
  };

  // Empty state
  if (!penInfo) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-6 text-center px-4">
        <div className="w-12 h-12 rounded-full bg-secondary/50 flex items-center justify-center mb-3">
          <Code2 className="w-6 h-6 text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground mb-1">No hay CodePen configurado</p>
        <p className="text-xs text-muted-foreground/60 mb-4">
          Agrega una URL de CodePen para mostrar tu snippet
        </p>
        <Button size="sm" onClick={() => setIsSettingsOpen(true)}>
          <Settings className="w-4 h-4 mr-2" />
          Configurar
        </Button>

        {/* Settings Dialog */}
        <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
          <DialogContent className="sm:max-w-md glass">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Code2 className="w-5 h-5 text-primary" />
                Configurar CodePen
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="pen-url">URL del Pen</Label>
                <Input
                  id="pen-url"
                  placeholder="https://codepen.io/usuario/pen/abc123"
                  value={formData.penUrl}
                  onChange={(e) => setFormData({ ...formData, penUrl: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  Pega la URL completa de cualquier CodePen
                </p>
              </div>

              <div className="space-y-2">
                <Label>Tema</Label>
                <Select
                  value={formData.theme}
                  onValueChange={(value: CodePenTheme) => setFormData({ ...formData, theme: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona tema" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dark">Oscuro</SelectItem>
                    <SelectItem value="light">Claro</SelectItem>
                    <SelectItem value="default">Por defecto</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Tab por defecto</Label>
                <Select
                  value={formData.defaultTab}
                  onValueChange={(value: CodePenTab) => setFormData({ ...formData, defaultTab: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona tab" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="result">Resultado</SelectItem>
                    <SelectItem value="html">HTML</SelectItem>
                    <SelectItem value="css">CSS</SelectItem>
                    <SelectItem value="js">JavaScript</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Mostrar resultado</Label>
                  <p className="text-xs text-muted-foreground">
                    Muestra el resultado junto al c&#243;digo
                  </p>
                </div>
                <Switch
                  checked={formData.showResult}
                  onCheckedChange={(checked) => setFormData({ ...formData, showResult: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Editable</Label>
                  <p className="text-xs text-muted-foreground">
                    Permite editar el c&#243;digo en el embed
                  </p>
                </div>
                <Switch
                  checked={formData.editable}
                  onCheckedChange={(checked) => setFormData({ ...formData, editable: checked })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setIsSettingsOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={!formData.penUrl}>
                Guardar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  const embedUrl = buildEmbedUrl(penInfo.user, penInfo.penId, config || {});

  return (
    <div className="relative h-full w-full overflow-hidden">
      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      )}

      {/* Error state */}
      {hasError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 z-10">
          <AlertCircle className="w-8 h-8 text-destructive mb-2" />
          <p className="text-sm text-muted-foreground">Error al cargar el Pen</p>
          <Button
            size="sm"
            variant="outline"
            className="mt-2"
            onClick={() => {
              setHasError(false);
              setIsLoading(true);
            }}
          >
            Reintentar
          </Button>
        </div>
      )}

      {/* CodePen iframe */}
      <iframe
        src={embedUrl}
        className={cn(
          "absolute inset-0 w-full h-full border-0",
          isLoading && "invisible"
        )}
        loading="lazy"
        allowFullScreen
        onLoad={handleIframeLoad}
        onError={handleIframeError}
        title={`CodePen by ${penInfo.user}`}
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
      />

      {/* Actions overlay */}
      <div className="absolute bottom-2 right-2 flex gap-1 opacity-0 hover:opacity-100 transition-opacity z-20">
        <Button
          size="icon"
          variant="secondary"
          className="h-7 w-7"
          onClick={handleSaveAsLink}
          title="Guardar como enlace"
        >
          <Bookmark className="w-3.5 h-3.5" />
        </Button>
        <Button
          size="icon"
          variant="secondary"
          className="h-7 w-7"
          onClick={() => setIsSettingsOpen(true)}
        >
          <Settings className="w-3.5 h-3.5" />
        </Button>
        <Button
          size="icon"
          variant="secondary"
          className="h-7 w-7"
          asChild
        >
          <a
            href={config?.penUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </Button>
      </div>

      {/* Settings Dialog */}
      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent className="sm:max-w-md glass">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Code2 className="w-5 h-5 text-primary" />
              Configurar CodePen
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="pen-url-edit">URL del Pen</Label>
              <Input
                id="pen-url-edit"
                placeholder="https://codepen.io/usuario/pen/abc123"
                value={formData.penUrl}
                onChange={(e) => setFormData({ ...formData, penUrl: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Tema</Label>
              <Select
                value={formData.theme}
                onValueChange={(value: CodePenTheme) => setFormData({ ...formData, theme: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona tema" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dark">Oscuro</SelectItem>
                  <SelectItem value="light">Claro</SelectItem>
                  <SelectItem value="default">Por defecto</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Tab por defecto</Label>
              <Select
                value={formData.defaultTab}
                onValueChange={(value: CodePenTab) => setFormData({ ...formData, defaultTab: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona tab" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="result">Resultado</SelectItem>
                  <SelectItem value="html">HTML</SelectItem>
                  <SelectItem value="css">CSS</SelectItem>
                  <SelectItem value="js">JavaScript</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Mostrar resultado</Label>
                <p className="text-xs text-muted-foreground">
                  Muestra el resultado junto al c&#243;digo
                </p>
              </div>
              <Switch
                checked={formData.showResult}
                onCheckedChange={(checked) => setFormData({ ...formData, showResult: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Editable</Label>
                <p className="text-xs text-muted-foreground">
                  Permite editar el c&#243;digo en el embed
                </p>
              </div>
              <Switch
                checked={formData.editable}
                onCheckedChange={(checked) => setFormData({ ...formData, editable: checked })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsSettingsOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={!formData.penUrl}>
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
