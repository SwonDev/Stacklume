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
  const exportToJSON = useLinksStore((state) => state.exportToJSON);
  const setLinks = useLinksStore((state) => state.setLinks);
  const setCategories = useLinksStore((state) => state.setCategories);
  const setTags = useLinksStore((state) => state.setTags);
  const setLinkTags = useLinksStore((state) => state.setLinkTags);
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
      toast.success("Copia de seguridad exportada correctamente");
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Error al exportar los datos");
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
      toast.success("Marcadores exportados correctamente");
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Error al exportar los marcadores");
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
      toast.success("Exportacion visual HTML completada");
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Error al exportar HTML visual");
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
        toast.error("Por favor permite las ventanas emergentes para exportar");
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

      toast.success("Usa 'Guardar como PDF' en el dialogo de impresion");
    } catch (error) {
      console.error("PDF Export error:", error);
      toast.error("Error al exportar PDF");
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
            // Refresh data from server
            const [linksRes, categoriesRes, tagsRes, linkTagsRes] = await Promise.all([
              fetch("/api/links", { credentials: "include" }),
              fetch("/api/categories", { credentials: "include" }),
              fetch("/api/tags", { credentials: "include" }),
              fetch("/api/link-tags", { credentials: "include" }),
            ]);

            const [newLinks, newCategories, newTags, newLinkTags] = await Promise.all([
              linksRes.json(),
              categoriesRes.json(),
              tagsRes.json(),
              linkTagsRes.json(),
            ]);

            setLinks(newLinks);
            setCategories(newCategories);
            setTags(newTags);
            setLinkTags(newLinkTags);

            toast.success(`Importados ${result.imported} enlaces correctamente`);
            setImportResult({
              success: true,
              message: `Importados ${result.imported} enlaces correctamente`,
            });
          } else {
            toast.error("Error al importar");
            throw new Error("Error al importar");
          }
        } else {
          throw new Error("Formato JSON no valido");
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
          // Refresh data from server
          const [linksRes, categoriesRes] = await Promise.all([
            fetch("/api/links", { credentials: "include" }),
            fetch("/api/categories", { credentials: "include" }),
          ]);

          const [newLinks, newCategories] = await Promise.all([
            linksRes.json(),
            categoriesRes.json(),
          ]);

          setLinks(newLinks);
          setCategories(newCategories);

          toast.success(`Importados ${result.imported} marcadores correctamente`);
          setImportResult({
            success: true,
            message: `Importados ${result.imported} marcadores correctamente`,
          });
        } else {
          toast.error("Error al importar HTML");
          throw new Error("Error al importar HTML");
        }
      } else {
        throw new Error("Formato de archivo no soportado");
      }
    } catch (error) {
      console.error("Import error:", error);
      const errorMessage = error instanceof Error ? error.message : "Error al importar";
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

  const exportOptions = [
    {
      id: "visual",
      title: "HTML Visual",
      description: "Pagina web elegante con previsualizaciones y etiquetas",
      icon: Sparkles,
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
      hoverBg: "group-hover:bg-purple-500",
      onClick: handleExportVisualHTML,
      badge: "Nuevo",
    },
    {
      id: "pdf",
      title: "Imprimir / PDF",
      description: "Abre dialogo de impresion (guarda como PDF)",
      icon: FileText,
      color: "text-red-500",
      bgColor: "bg-red-500/10",
      hoverBg: "group-hover:bg-red-500",
      onClick: handleExportPDF,
      badge: "Nuevo",
    },
    {
      id: "netscape",
      title: "Marcadores HTML",
      description: "Compatible con Chrome, Firefox, Edge y Safari",
      icon: Globe,
      color: "text-orange-500",
      bgColor: "bg-orange-500/10",
      hoverBg: "group-hover:bg-orange-500",
      onClick: handleExportNetscape,
    },
    {
      id: "json",
      title: "Copia de seguridad JSON",
      description: "Backup completo con todos los datos y etiquetas",
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
            Importar / Exportar
          </DialogTitle>
          <DialogDescription>
            Exporta tus enlaces en diferentes formatos o importa desde otro navegador
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="export" className="mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="export" className="gap-2">
              <Download className="w-4 h-4" />
              Exportar
            </TabsTrigger>
            <TabsTrigger value="import" className="gap-2">
              <Upload className="w-4 h-4" />
              Importar
            </TabsTrigger>
          </TabsList>

          <TabsContent value="export" className="space-y-4 mt-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {links.length} enlaces en {categories.length} categorias
              </span>
              <span className="text-muted-foreground">
                {tags.length} etiquetas
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
                        <h4 className="font-medium text-sm">{option.title}</h4>
                        {option.badge && (
                          <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded bg-primary/20 text-primary">
                            {option.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {option.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            {links.length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-4">
                No tienes enlaces guardados para exportar
              </p>
            )}
          </TabsContent>

          <TabsContent value="import" className="space-y-4 mt-4">
            <div className="bg-secondary/30 rounded-lg p-4 space-y-3">
              <h4 className="font-medium text-sm">Formatos soportados</h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-start gap-2">
                  <FileJson className="w-4 h-4 text-blue-500 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">JSON</p>
                    <p className="text-xs text-muted-foreground">
                      Copia de seguridad de Stacklume
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <FileCode className="w-4 h-4 text-orange-500 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">HTML</p>
                    <p className="text-xs text-muted-foreground">
                      Marcadores de navegador
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
              {isImporting ? "Importando..." : "Seleccionar archivo"}
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
              Los enlaces duplicados se ignoraran automaticamente
            </p>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
