"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Rocket, RefreshCw, ExternalLink, ArrowUp, MessageCircle, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import type { Widget } from "@/types/widget";

interface ProductHuntWidgetProps {
  widget: Widget;
}

interface Product {
  id: string;
  name: string;
  tagline: string;
  description: string;
  url: string;
  votesCount: number;
  commentsCount: number;
  thumbnailUrl?: string;
  topics: string[];
  makerNames: string[];
  featured: boolean;
  launchDate: string;
}

// Sample curated products (PH API requires OAuth)
const SAMPLE_PRODUCTS: Product[] = [
  {
    id: "1",
    name: "Claude AI",
    tagline: "El asistente de IA mas avanzado de Anthropic",
    description: "Claude es un asistente de IA desarrollado por Anthropic, disenado para ser util, inofensivo y honesto.",
    url: "https://claude.ai",
    votesCount: 2847,
    commentsCount: 432,
    thumbnailUrl: "https://ph-avatars.imgix.net/5001/original?auto=compress&codec=mozjpeg&cs=strip&fit=crop&format=webp&h=240&w=240&v=1",
    topics: ["Artificial Intelligence", "Productivity"],
    makerNames: ["Anthropic"],
    featured: true,
    launchDate: "2024-03-04",
  },
  {
    id: "2",
    name: "Cursor",
    tagline: "El IDE del futuro con IA integrada",
    description: "Cursor es un editor de codigo impulsado por IA que entiende tu codigo base completo.",
    url: "https://cursor.so",
    votesCount: 3521,
    commentsCount: 512,
    thumbnailUrl: "https://ph-avatars.imgix.net/3671/original?auto=compress&codec=mozjpeg&cs=strip&fit=crop&format=webp&h=240&w=240&v=1",
    topics: ["Developer Tools", "AI"],
    makerNames: ["Cursor Team"],
    featured: true,
    launchDate: "2024-02-15",
  },
  {
    id: "3",
    name: "v0 by Vercel",
    tagline: "Genera UI con IA usando shadcn/ui",
    description: "v0 genera codigo de React con Tailwind CSS basado en descripciones de texto o imagenes.",
    url: "https://v0.dev",
    votesCount: 4123,
    commentsCount: 623,
    thumbnailUrl: "https://ph-avatars.imgix.net/2421/original?auto=compress&codec=mozjpeg&cs=strip&fit=crop&format=webp&h=240&w=240&v=1",
    topics: ["Developer Tools", "AI", "Design Tools"],
    makerNames: ["Vercel"],
    featured: true,
    launchDate: "2024-01-20",
  },
  {
    id: "4",
    name: "Raycast",
    tagline: "Tu launcher de productividad para Mac",
    description: "Raycast te permite controlar tus herramientas con atajos de teclado y extensiones.",
    url: "https://raycast.com",
    votesCount: 2156,
    commentsCount: 287,
    thumbnailUrl: "https://ph-avatars.imgix.net/1234/original?auto=compress&codec=mozjpeg&cs=strip&fit=crop&format=webp&h=240&w=240&v=1",
    topics: ["Productivity", "Mac"],
    makerNames: ["Raycast Team"],
    featured: true,
    launchDate: "2024-02-28",
  },
  {
    id: "5",
    name: "Linear",
    tagline: "Herramienta moderna de gestion de proyectos",
    description: "Linear es la forma en que los equipos de software modernos construyen productos excelentes.",
    url: "https://linear.app",
    votesCount: 1987,
    commentsCount: 234,
    thumbnailUrl: "https://ph-avatars.imgix.net/5678/original?auto=compress&codec=mozjpeg&cs=strip&fit=crop&format=webp&h=240&w=240&v=1",
    topics: ["Productivity", "Developer Tools"],
    makerNames: ["Linear Team"],
    featured: true,
    launchDate: "2024-03-01",
  },
  {
    id: "6",
    name: "Notion AI",
    tagline: "IA integrada en tu espacio de trabajo",
    description: "Notion AI te ayuda a escribir, resumir y generar contenido directamente en Notion.",
    url: "https://notion.so",
    votesCount: 2654,
    commentsCount: 389,
    thumbnailUrl: "https://ph-avatars.imgix.net/9012/original?auto=compress&codec=mozjpeg&cs=strip&fit=crop&format=webp&h=240&w=240&v=1",
    topics: ["Productivity", "AI", "Writing Tools"],
    makerNames: ["Notion"],
    featured: true,
    launchDate: "2024-01-10",
  },
  {
    id: "7",
    name: "Arc Browser",
    tagline: "El navegador del futuro",
    description: "Arc reimagina como usamos internet con un diseno innovador y espacios de trabajo.",
    url: "https://arc.net",
    votesCount: 3876,
    commentsCount: 567,
    thumbnailUrl: "https://ph-avatars.imgix.net/3456/original?auto=compress&codec=mozjpeg&cs=strip&fit=crop&format=webp&h=240&w=240&v=1",
    topics: ["Web Browsers", "Productivity"],
    makerNames: ["The Browser Company"],
    featured: true,
    launchDate: "2024-02-01",
  },
  {
    id: "8",
    name: "Supabase",
    tagline: "La alternativa open source a Firebase",
    description: "Supabase es una plataforma backend-as-a-service con base de datos Postgres.",
    url: "https://supabase.com",
    votesCount: 2234,
    commentsCount: 312,
    thumbnailUrl: "https://ph-avatars.imgix.net/7890/original?auto=compress&codec=mozjpeg&cs=strip&fit=crop&format=webp&h=240&w=240&v=1",
    topics: ["Developer Tools", "Open Source"],
    makerNames: ["Supabase Team"],
    featured: true,
    launchDate: "2024-03-10",
  },
];

const ITEMS_PER_PAGE = 5;

export function ProductHuntWidget({ widget: _widget }: ProductHuntWidgetProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);

  // Paginated products
  const visibleProducts = useMemo(() => {
    return products.slice(0, visibleCount);
  }, [products, visibleCount]);

  const hasMore = visibleCount < products.length;
  const canCollapse = visibleCount > ITEMS_PER_PAGE;

  // Simulate fetching products
  const fetchProducts = useCallback(() => {
    setLoading(true);
    // Simulate API delay
    setTimeout(() => {
      // Shuffle and sort by votes
      const shuffled = [...SAMPLE_PRODUCTS].sort(() => Math.random() - 0.5);
      setProducts(shuffled);
      setLoading(false);
    }, 500);
  }, []);

  // Initial fetch
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      fetchProducts();
    });
    return () => cancelAnimationFrame(frame);
  }, [fetchProducts]);

  // Show more products
  const handleShowMore = () => {
    setVisibleCount((prev) => Math.min(prev + ITEMS_PER_PAGE, products.length));
  };

  // Collapse to initial view
  const handleCollapse = () => {
    setVisibleCount(ITEMS_PER_PAGE);
  };

  // Format votes count
  const formatVotes = (count: number): string => {
    if (count >= 1000) return `${(count / 1000).toFixed(1)}k`;
    return count.toString();
  };

  return (
    <div className="flex h-full flex-col @container">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#DA552F]/10">
            <Rocket className="h-4 w-4 text-[#DA552F]" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">Product Hunt</h3>
            <p className="text-xs text-muted-foreground">Productos destacados</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={fetchProducts}
            disabled={loading}
            className="h-8 w-8"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
          <a
            href="https://www.producthunt.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-accent"
            title="Ver en Product Hunt"
          >
            <ExternalLink className="h-4 w-4 text-muted-foreground" />
          </a>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {loading && products.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Cargando productos...</p>
            </div>
          </div>
        ) : (
          <ScrollArea className="h-full">
            <div className="space-y-1 p-3">
              {visibleProducts.map((product) => (
                <a
                  key={product.id}
                  href={product.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group block rounded-lg border bg-card p-3 transition-colors hover:border-[#DA552F]/50 hover:bg-accent/50"
                >
                  <div className="flex gap-3">
                    {/* Thumbnail / Votes */}
                    <div className="flex flex-shrink-0 flex-col items-center gap-1">
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg border bg-muted text-lg font-bold text-[#DA552F]">
                        {product.name.charAt(0)}
                      </div>
                      <div className="flex items-center gap-0.5 text-xs font-medium text-[#DA552F]">
                        <ArrowUp className="h-3 w-3" />
                        {formatVotes(product.votesCount)}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="min-w-0 flex-1">
                      {/* Name & Featured Badge */}
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-sm group-hover:text-[#DA552F]">
                          {product.name}
                        </h4>
                        {product.featured && (
                          <Badge variant="secondary" className="text-[9px] h-4 px-1">
                            DESTACADO
                          </Badge>
                        )}
                      </div>

                      {/* Tagline */}
                      <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                        {product.tagline}
                      </p>

                      {/* Topics */}
                      <div className="mt-2 flex flex-wrap items-center gap-1">
                        {product.topics.slice(0, 2).map((topic) => (
                          <Badge
                            key={topic}
                            variant="outline"
                            className="text-[9px] h-4 px-1"
                          >
                            {topic}
                          </Badge>
                        ))}
                        <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
                          <MessageCircle className="h-3 w-3" />
                          {product.commentsCount}
                        </span>
                      </div>
                    </div>

                    {/* External link */}
                    <ExternalLink className="mt-1 h-3.5 w-3.5 flex-shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                  </div>
                </a>
              ))}

              {/* Pagination Controls */}
              {(hasMore || canCollapse) && (
                <div className="flex items-center justify-center gap-2 pt-2 pb-1">
                  {hasMore && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleShowMore}
                      className="h-8 gap-1 text-xs"
                    >
                      <ChevronDown className="h-3.5 w-3.5" />
                      Ver mas ({products.length - visibleCount} restantes)
                    </Button>
                  )}
                  {canCollapse && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleCollapse}
                      className="h-8 gap-1 text-xs"
                    >
                      <ChevronUp className="h-3.5 w-3.5" />
                      Colapsar
                    </Button>
                  )}
                </div>
              )}
            </div>
          </ScrollArea>
        )}
      </div>

      {/* Footer */}
      <div className="border-t px-4 py-2 text-center">
        <p className="text-[10px] text-muted-foreground">
          Productos de ejemplo - La API de Product Hunt requiere autenticacion OAuth
        </p>
        <a
          href="https://www.producthunt.com"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1 inline-flex items-center gap-1 text-xs text-[#DA552F] hover:underline"
        >
          <ExternalLink className="h-3 w-3" />
          Ver mas en Product Hunt
        </a>
      </div>
    </div>
  );
}
