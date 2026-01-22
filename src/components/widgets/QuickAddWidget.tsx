"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { useLinksStore } from "@/stores/links-store";
import { getCsrfHeaders } from "@/hooks/useCsrf";

const quickAddSchema = z.object({
  url: z.string().url("Por favor, introduce una URL válida"),
});

type QuickAddFormValues = z.infer<typeof quickAddSchema>;

export function QuickAddWidget() {
  const { addLink } = useLinksStore();
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const form = useForm<QuickAddFormValues>({
    resolver: zodResolver(quickAddSchema),
    defaultValues: {
      url: "",
    },
  });

  const onSubmit = async (values: QuickAddFormValues) => {
    setIsLoading(true);
    setShowSuccess(false);

    try {
      // Step 1: Scrape metadata from the URL
      const scrapeResponse = await fetch("/api/scrape", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getCsrfHeaders(),
        },
        credentials: "include",
        body: JSON.stringify({
          url: values.url,
        }),
      });

      let scrapedData = null;
      if (scrapeResponse.ok) {
        scrapedData = await scrapeResponse.json();
      }

      // Step 2: Create the link with scraped metadata
      const linkData = {
        url: values.url,
        title: scrapedData?.title || values.url,
        description: scrapedData?.description || null,
        faviconUrl: scrapedData?.faviconUrl || null,
        imageUrl: scrapedData?.imageUrl || null,
        isFavorite: false,
      };

      const response = await fetch("/api/links", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getCsrfHeaders(),
        },
        credentials: "include",
        body: JSON.stringify(linkData),
      });

      if (!response.ok) {
        throw new Error("Failed to create link");
      }

      const newLink = await response.json();

      // Add to store
      addLink(newLink);

      // Show success state
      setShowSuccess(true);
      form.reset();

      // Show success toast
      toast.success("Enlace añadido correctamente", {
        description: scrapedData?.title || values.url,
      });

      // Hide success message after 2 seconds
      setTimeout(() => {
        setShowSuccess(false);
      }, 2000);
    } catch (error) {
      console.error("Error adding link:", error);
      form.setError("url", {
        message: "Error al añadir el enlace",
      });
      toast.error("Error al añadir el enlace", {
        description: "Por favor, verifica la URL e intenta de nuevo",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="@container h-full w-full">
      <div className="flex flex-col items-center justify-center h-full w-full px-2 @xs:px-3 @md:px-4 @lg:px-6 gap-2 @xs:gap-3 @md:gap-4">
        {/* Icon - Hidden on very small containers, scales up on larger ones */}
        <div className="hidden @xs:flex w-8 h-8 @sm:w-10 @sm:h-10 @md:w-12 @md:h-12 rounded-full bg-primary/10 items-center justify-center flex-shrink-0">
          <Plus className="w-4 h-4 @sm:w-5 @sm:h-5 @md:w-6 @md:h-6 text-primary" />
        </div>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="w-full space-y-2 @xs:space-y-2.5 @md:space-y-3"
          >
            <FormField
              control={form.control}
              name="url"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input
                      placeholder="https://ejemplo.com"
                      {...field}
                      disabled={isLoading}
                      className="text-xs @xs:text-sm @md:text-base h-8 @xs:h-9 @md:h-10 px-2 @xs:px-3 @md:px-4"
                    />
                  </FormControl>
                  <FormMessage className="text-[10px] @xs:text-xs @md:text-sm" />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              className="w-full h-8 @xs:h-9 @md:h-10 text-xs @xs:text-sm @md:text-base px-2 @xs:px-3 @md:px-4"
              disabled={isLoading || showSuccess}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-3 h-3 @xs:w-4 @xs:h-4 animate-spin" />
                  {/* Very small: icon only */}
                  <span className="hidden @[120px]:inline ml-1.5 @xs:ml-2">
                    <span className="@[120px]:inline @sm:hidden">...</span>
                    <span className="hidden @sm:inline">Obteniendo datos...</span>
                  </span>
                </>
              ) : showSuccess ? (
                <>
                  <CheckCircle2 className="w-3 h-3 @xs:w-4 @xs:h-4" />
                  {/* Very small: icon only */}
                  <span className="hidden @[120px]:inline ml-1.5 @xs:ml-2">
                    <span className="@[120px]:inline @sm:hidden">OK</span>
                    <span className="hidden @sm:inline">¡Añadido!</span>
                  </span>
                </>
              ) : (
                <>
                  <Plus className="w-3 h-3 @xs:w-4 @xs:h-4" />
                  {/* Very small: icon only */}
                  <span className="hidden @[120px]:inline ml-1.5 @xs:ml-2">
                    <span className="@[120px]:inline @sm:hidden">Añadir</span>
                    <span className="hidden @sm:inline">Añadir enlace</span>
                  </span>
                </>
              )}
            </Button>
          </form>
        </Form>

        {/* Success message - adapts to container size */}
        {showSuccess && (
          <p className="text-[10px] @xs:text-xs @md:text-sm text-green-500 animate-in fade-in text-center px-2">
            <span className="hidden @sm:inline">Enlace añadido correctamente</span>
            <span className="inline @sm:hidden">¡Añadido!</span>
          </p>
        )}

        {/* Helper text - only shown on larger containers */}
        <p className="hidden @lg:block text-xs text-muted-foreground text-center px-4">
          Pega una URL para añadirla rápidamente a tu colección
        </p>
      </div>
    </div>
  );
}
