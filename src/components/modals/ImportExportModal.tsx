"use client";

import { useState, useRef } from "react";
import { toast } from "sonner";
import { useTheme } from "next-themes";
import {
  Download,
  Upload,
  FileJson,
  FileCode,
  FileText,
  Check,
  AlertCircle,
  Loader2,
  Globe,
  Sparkles,
  Puzzle,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLinksStore } from "@/stores/links-store";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";
import {
  generateVisualHTML,
  generatePDFHTML,
  generateNetscapeHTML,
} from "@/lib/export-utils";
import { getCsrfHeaders } from "@/hooks/useCsrf";

interface ImportExportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ImportExportModal({ open, onOpenChange }: ImportExportModalProps) {
  const { t } = useTranslation();
  const exportToJSON = useLinksStore((state) => state.exportToJSON);
  const refreshAllData = useLinksStore((state) => state.refreshAllData);
  const links = useLinksStore((state) => state.links);
  const categories = useLinksStore((state) => state.categories);
  const tags = useLinksStore((state) => state.tags);
  const linkTags = useLinksStore((state) => state.linkTags);
  const { resolvedTheme } = useTheme();
  const [isExporting, setIsExporting] = useState(false);
  const [exportingType, setExportingType] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ success: boolean; message: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const widgetFileInputRef = useRef<HTMLInputElement>(null);

  const [isExportingWidgets, setIsExportingWidgets] = useState(false);
  const [isImportingWidget, setIsImportingWidget] = useState(false);
  const [widgetImportResult, setWidgetImportResult] = useState<{ success: boolean; message: string } | null>(null);

  // Detect current theme for PDF export
  const currentTheme: "light" | "dark" = resolvedTheme === "light" ? "light" : "dark";

  const handleExportJSON = () => {
    setIsExporting(true);
    setExportingType("json");
    try {
      const jsonData = exportToJSON();
      const blob = new Blob([jsonData], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `stacklume-backup-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(t("importExport.jsonExportSuccess"));
    } catch (error) {
      console.error("Export error:", error);
      toast.error(t("importExport.jsonExportError"));
    } finally {
      setIsExporting(false);
      setExportingType(null);
    }
  };

  const handleExportNetscape = () => {
    setIsExporting(true);
    setExportingType("netscape");
    try {
      const htmlData = generateNetscapeHTML({ links, categories, tags, linkTags });
      const blob = new Blob([htmlData], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `stacklume-bookmarks-${new Date().toISOString().split("T")[0]}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(t("importExport.netscapeExportSuccess"));
    } catch (error) {
      console.error("Export error:", error);
      toast.error(t("importExport.netscapeExportError"));
    } finally {
      setIsExporting(false);
      setExportingType(null);
    }
  };

  const handleExportVisualHTML = () => {
    setIsExporting(true);
    setExportingType("visual");
    try {
      const htmlData = generateVisualHTML({ links, categories, tags, linkTags });
      const blob = new Blob([htmlData], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `stacklume-visual-${new Date().toISOString().split("T")[0]}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(t("importExport.visualExportSuccess"));
    } catch (error) {
      console.error("Export error:", error);
      toast.error(t("importExport.visualExportError"));
    } finally {
      setIsExporting(false);
      setExportingType(null);
    }
  };

  const handleExportPDF = () => {
    setIsExporting(true);
    setExportingType("pdf");
    try {
      // Generate PDF HTML with current theme
      const htmlContent = generatePDFHTML({ links, categories, tags, linkTags }, currentTheme);

      // Open in new window for printing - most reliable method
      // This avoids html2canvas issues with lab() colors from Tailwind CSS v4
      const printWindow = window.open("", "_blank");
      if (!printWindow) {
        toast.error(t("importExport.allowPopups"));
        return;
      }

      printWindow.document.write(htmlContent);
      printWindow.document.close();

      // Wait for fonts and images to load, then trigger print
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print();
        }, 800);
      };

      toast.success(t("importExport.pdfExportSuccess"));
    } catch (error) {
      console.error("PDF Export error:", error);
      toast.error(t("importExport.pdfExportError"));
    } finally {
      setIsExporting(false);
      setExportingType(null);
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportResult(null);

    try {
      const content = await file.text();

      if (file.name.endsWith(".json")) {
        // Import JSON backup
        const data = JSON.parse(content);

        if (data.links && Array.isArray(data.links)) {
          // This is a Stacklume backup
          // Call API to import the data
          const response = await fetch("/api/links/import", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...getCsrfHeaders(),
            },
            credentials: "include",
            body: JSON.stringify(data),
          });

          if (response.ok) {
            const result = await response.json();
            // Recargar todo el estado desde el servidor sin caché (evita datos obsoletos en Tauri/WebView2)
            await refreshAllData();

            toast.success(t("importExport.importedLinks", { count: result.imported }));
            setImportResult({
              success: true,
              message: t("importExport.importedLinks", { count: result.imported }),
            });
          } else {
            toast.error(t("importExport.importError"));
            throw new Error(t("importExport.importError"));
          }
        } else {
          throw new Error(t("importExport.invalidJsonFormat"));
        }
      } else if (file.name.endsWith(".html")) {
        // Import HTML bookmarks (Netscape format)
        const response = await fetch("/api/links/import-html", {
          method: "POST",
          headers: {
            "Content-Type": "text/html",
            ...getCsrfHeaders(),
          },
          credentials: "include",
          body: content,
        });

        if (response.ok) {
          const result = await response.json();
          // Recargar todo el estado desde el servidor sin caché
          await refreshAllData();

          toast.success(t("importExport.importedBookmarks", { count: result.imported }));
          setImportResult({
            success: true,
            message: t("importExport.importedBookmarks", { count: result.imported }),
          });
        } else {
          toast.error(t("importExport.importHtmlError"));
          throw new Error(t("importExport.importHtmlError"));
        }
      } else {
        throw new Error(t("importExport.unsupportedFormat"));
      }
    } catch (error) {
      console.error("Import error:", error);
      const errorMessage = error instanceof Error ? error.message : t("importExport.importError");
      toast.error(errorMessage);
      setImportResult({
        success: false,
        message: errorMessage,
      });
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleExportAllWidgetTypes = async () => {
    setIsExportingWidgets(true);
    try {
      const res = await fetch("/api/custom-widget-types", { credentials: "include" });
      if (!res.ok) throw new Error(t("importExport.widgetFetchError"));
      const types = await res.json();
      if (!Array.isArray(types) || types.length === 0) {
        toast.info(t("importExport.noWidgetsToExport"));
        return;
      }
      const exportData = types.map((t: Record<string, unknown>) => ({
        stacklume_widget_type: "1.0",
        name: t.name,
        description: t.description,
        category: t.category,
        icon: t.icon,
        htmlTemplate: t.htmlTemplate,
        configSchema: t.configSchema,
        defaultConfig: t.defaultConfig,
        defaultWidth: t.defaultWidth,
        defaultHeight: t.defaultHeight,
      }));
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `stacklume-custom-widgets-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(t("importExport.widgetsExported", { count: exportData.length }));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("importExport.exportError"));
    } finally {
      setIsExportingWidgets(false);
    }
  };

  const handleWidgetFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsImportingWidget(true);
    setWidgetImportResult(null);
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const items = Array.isArray(data) ? data : [data];
      let imported = 0;
      for (const item of items) {
        if (item.stacklume_widget_type !== "1.0") continue;
        const res = await fetch("/api/custom-widget-types", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...getCsrfHeaders() },
          credentials: "include",
          body: JSON.stringify({
            name: item.name || t("importExport.importedWidget"),
            description: item.description || undefined,
            category: item.category || "custom",
            icon: item.icon || "Puzzle",
            htmlTemplate: item.htmlTemplate,
            configSchema: item.configSchema || undefined,
            defaultConfig: item.defaultConfig || undefined,
            defaultWidth: item.defaultWidth || 2,
            defaultHeight: item.defaultHeight || 2,
          }),
        });
        if (res.ok) imported++;
      }
      setWidgetImportResult({ success: true, message: t("importExport.widgetsImported", { count: imported }) });
      toast.success(t("importExport.widgetsImported", { count: imported }));
    } catch (error) {
      const msg = error instanceof Error ? error.message : t("importExport.importError");
      setWidgetImportResult({ success: false, message: msg });
      toast.error(msg);
    } finally {
      setIsImportingWidget(false);
      if (widgetFileInputRef.current) widgetFileInputRef.current.value = "";
    }
  };

  const exportOptions = [
    {
      id: "visual",
      titleKey: "importExport.visualTitle",
      descKey: "importExport.visualDesc",
      icon: Sparkles,
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
      hoverBg: "group-hover:bg-purple-500",
      onClick: handleExportVisualHTML,
      badgeKey: "importExport.badgeNew",
    },
    {
      id: "pdf",
      titleKey: "importExport.pdfTitle",
      descKey: "importExport.pdfDesc",
      icon: FileText,
      color: "text-red-500",
      bgColor: "bg-red-500/10",
      hoverBg: "group-hover:bg-red-500",
      onClick: handleExportPDF,
      badgeKey: "importExport.badgeNew",
    },
    {
      id: "netscape",
      titleKey: "importExport.netscapeTitle",
      descKey: "importExport.netscapeDesc",
      icon: Globe,
      color: "text-orange-500",
      bgColor: "bg-orange-500/10",
      hoverBg: "group-hover:bg-orange-500",
      onClick: handleExportNetscape,
    },
    {
      id: "json",
      titleKey: "importExport.jsonTitle",
      descKey: "importExport.jsonDesc",
      icon: FileJson,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
      hoverBg: "group-hover:bg-blue-500",
      onClick: handleExportJSON,
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl glass">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="w-5 h-5 text-primary" />
            {t("importExport.title")}
          </DialogTitle>
          <DialogDescription>
            {t("importExport.description")}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="export" className="mt-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="export" className="gap-2">
              <Download className="w-4 h-4" />
              {t("importExport.export")}
            </TabsTrigger>
            <TabsTrigger value="import" className="gap-2">
              <Upload className="w-4 h-4" />
              {t("importExport.import")}
            </TabsTrigger>
            <TabsTrigger value="widgets" className="gap-2">
              <Puzzle className="w-4 h-4" />
              Widgets
            </TabsTrigger>
          </TabsList>

          <TabsContent value="export" className="space-y-4 mt-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {t("importExport.linksInCategories", { links: links.length, categories: categories.length })}
              </span>
              <span className="text-muted-foreground">
                {t("importExport.tagsCount", { count: tags.length })}
              </span>
            </div>

            <div className="grid gap-3">
              {exportOptions.map((option) => {
                const Icon = option.icon;
                const isLoading = isExporting && exportingType === option.id;

                return (
                  <button
                    key={option.id}
                    onClick={option.onClick}
                    disabled={isExporting || links.length === 0}
                    className={cn(
                      "flex items-start gap-3 p-4 rounded-lg border border-border/50",
                      "hover:bg-secondary/50 hover:border-primary/30 transition-all",
                      "text-left group disabled:opacity-50 disabled:cursor-not-allowed",
                      "relative overflow-hidden"
                    )}
                  >
                    <div className={cn(
                      "p-2 rounded-lg transition-colors",
                      option.bgColor,
                      option.color,
                      option.hoverBg,
                      "group-hover:text-white"
                    )}>
                      {isLoading ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <Icon className="w-5 h-5" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-sm">{t(option.titleKey)}</h4>
                        {option.badgeKey && (
                          <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded bg-primary/20 text-primary">
                            {t(option.badgeKey)}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {t(option.descKey)}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            {links.length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-4">
                {t("importExport.noLinksToExport")}
              </p>
            )}
          </TabsContent>

          <TabsContent value="import" className="space-y-4 mt-4">
            <div className="bg-secondary/30 rounded-lg p-4 space-y-3">
              <h4 className="font-medium text-sm">{t("importExport.supportedFormats")}</h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-start gap-2">
                  <FileJson className="w-4 h-4 text-blue-500 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">JSON</p>
                    <p className="text-xs text-muted-foreground">
                      {t("importExport.jsonBackupDesc")}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <FileCode className="w-4 h-4 text-orange-500 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">HTML</p>
                    <p className="text-xs text-muted-foreground">
                      {t("importExport.htmlBookmarksDesc")}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".json,.html"
              onChange={handleFileChange}
              className="hidden"
            />

            <Button
              onClick={handleImportClick}
              disabled={isImporting}
              className="w-full gap-2"
              variant="outline"
              size="lg"
            >
              {isImporting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
              {isImporting ? t("importExport.importing") : t("importExport.selectFile")}
            </Button>

            {/* Import result */}
            {importResult && (
              <div
                className={cn(
                  "flex items-center gap-2 p-3 rounded-lg",
                  importResult.success
                    ? "bg-green-500/10 text-green-600 dark:text-green-400"
                    : "bg-red-500/10 text-red-600 dark:text-red-400"
                )}
              >
                {importResult.success ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <AlertCircle className="w-4 h-4" />
                )}
                <span className="text-sm">{importResult.message}</span>
              </div>
            )}

            <p className="text-xs text-muted-foreground text-center">
              {t("importExport.duplicatesIgnored")}
            </p>
          </TabsContent>

          {/* Custom Widget Types tab */}
          <TabsContent value="widgets" className="space-y-4 mt-4">
            <p className="text-sm text-muted-foreground">
              {t("importExport.widgetsTabDesc")}
            </p>

            {/* Export */}
            <button
              onClick={handleExportAllWidgetTypes}
              disabled={isExportingWidgets}
              className={cn(
                "flex items-start gap-3 p-4 rounded-lg border border-border/50 w-full",
                "hover:bg-secondary/50 hover:border-primary/30 transition-all",
                "text-left group disabled:opacity-50 disabled:cursor-not-allowed"
              )}
            >
              <div className="p-2 rounded-lg bg-purple-500/10 text-purple-500 group-hover:bg-purple-500 group-hover:text-white transition-colors">
                {isExportingWidgets ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
              </div>
              <div>
                <h4 className="font-medium text-sm">{t("importExport.exportCustomWidgets")}</h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {t("importExport.exportCustomWidgetsDesc")}
                </p>
              </div>
            </button>

            {/* Import */}
            <input
              ref={widgetFileInputRef}
              type="file"
              accept=".json"
              onChange={handleWidgetFileChange}
              className="hidden"
            />
            <Button
              onClick={() => widgetFileInputRef.current?.click()}
              disabled={isImportingWidget}
              className="w-full gap-2"
              variant="outline"
              size="lg"
            >
              {isImportingWidget ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              {isImportingWidget ? t("importExport.importing") : t("importExport.importWidgets")}
            </Button>

            {widgetImportResult && (
              <div className={cn(
                "flex items-center gap-2 p-3 rounded-lg",
                widgetImportResult.success
                  ? "bg-green-500/10 text-green-600 dark:text-green-400"
                  : "bg-red-500/10 text-red-600 dark:text-red-400"
              )}>
                {widgetImportResult.success ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                <span className="text-sm">{widgetImportResult.message}</span>
              </div>
            )}

            <p className="text-xs text-muted-foreground text-center">
              Formato: JSON con stacklume_widget_type: &quot;1.0&quot; (individual o array)
            </p>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
