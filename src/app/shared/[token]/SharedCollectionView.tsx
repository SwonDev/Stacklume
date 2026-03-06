"use client";

import { useState, useEffect } from "react";
import {
  FolderOpen,
  Tag,
  ExternalLink,
  Clock,
  AlertCircle,
  Loader2,
  Link2Off,
  Globe,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "motion/react";

interface SharedLink {
  id: string;
  url: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  faviconUrl: string | null;
  platform: string | null;
  createdAt: string;
}

interface CollectionData {
  name: string;
  type: string;
  color?: string | null;
  icon?: string | null;
  links: SharedLink[];
}

interface SharedCollectionViewProps {
  token: string;
}

// Platform color mapping
const PLATFORM_COLORS: Record<string, string> = {
  youtube: "#FF0000",
  github: "#333333",
  spotify: "#1DB954",
  steam: "#1b2838",
  twitter: "#1DA1F2",
  reddit: "#FF4500",
  stackoverflow: "#F48024",
  npm: "#CB3837",
  figma: "#F24E1E",
  dribbble: "#EA4C89",
};

// Tag color mapping (same as sidebar)
const TAG_COLOR_MAP: Record<string, string> = {
  red: "#ef4444",
  orange: "#f97316",
  amber: "#f59e0b",
  yellow: "#eab308",
  lime: "#84cc16",
  green: "#22c55e",
  emerald: "#10b981",
  teal: "#14b8a6",
  cyan: "#06b6d4",
  sky: "#0ea5e9",
  blue: "#3b82f6",
  indigo: "#6366f1",
  violet: "#8b5cf6",
  purple: "#a855f7",
  fuchsia: "#d946ef",
  pink: "#ec4899",
  rose: "#f43f5e",
  slate: "#64748b",
  gray: "#6b7280",
  zinc: "#71717a",
  neutral: "#737373",
  stone: "#78716c",
};

function resolveColor(color: string | null | undefined): string {
  if (!color) return "#6b7280";
  // If it's already a hex color
  if (color.startsWith("#")) return color;
  // Map from Tailwind name
  return TAG_COLOR_MAP[color] || "#6b7280";
}

function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace("www.", "");
  } catch {
    return url;
  }
}

function LinkCard({ link }: { link: SharedLink }) {
  const platformColor = link.platform
    ? PLATFORM_COLORS[link.platform]
    : undefined;

  return (
    <motion.a
      href={link.url}
      target="_blank"
      rel="noopener noreferrer"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={cn(
        "group block rounded-xl border border-border/60 bg-card/80 backdrop-blur-sm",
        "hover:border-border hover:bg-card hover:shadow-lg",
        "transition-all duration-200 overflow-hidden"
      )}
      style={
        platformColor
          ? { borderLeftColor: platformColor, borderLeftWidth: "3px" }
          : undefined
      }
    >
      {/* Image preview */}
      {link.imageUrl && (
        <div className="relative h-36 w-full overflow-hidden bg-muted/50">
          <img
            src={link.imageUrl}
            alt=""
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        </div>
      )}

      <div className="p-4 space-y-2">
        {/* Title row */}
        <div className="flex items-start gap-3">
          {link.faviconUrl ? (
            <img
              src={link.faviconUrl}
              alt=""
              className="h-5 w-5 rounded-sm mt-0.5 shrink-0"
              loading="lazy"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          ) : (
            <Globe className="h-5 w-5 text-muted-foreground/50 mt-0.5 shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium text-foreground leading-snug line-clamp-2 group-hover:text-primary transition-colors">
              {link.title || getDomain(link.url)}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5 truncate">
              {getDomain(link.url)}
            </p>
          </div>
          <ExternalLink className="h-4 w-4 text-muted-foreground/30 group-hover:text-muted-foreground transition-colors shrink-0 mt-0.5" />
        </div>

        {/* Description */}
        {link.description && (
          <p className="text-xs text-muted-foreground/80 line-clamp-2 leading-relaxed">
            {link.description}
          </p>
        )}

        {/* Footer */}
        <div className="flex items-center gap-2 pt-1">
          {link.platform && (
            <Badge
              variant="outline"
              className="text-[10px] px-1.5 py-0"
              style={
                platformColor
                  ? { borderColor: `${platformColor}40`, color: platformColor }
                  : undefined
              }
            >
              {link.platform}
            </Badge>
          )}
          <span className="text-[10px] text-muted-foreground/50 ml-auto">
            {new Date(link.createdAt).toLocaleDateString("es-ES", {
              day: "numeric",
              month: "short",
            })}
          </span>
        </div>
      </div>
    </motion.a>
  );
}

export function SharedCollectionView({ token }: SharedCollectionViewProps) {
  const [data, setData] = useState<CollectionData | null>(null);
  const [error, setError] = useState<{ status: number; message: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchCollection() {
      try {
        const res = await fetch(`/api/shared/${token}`, { cache: "no-store" });
        if (!res.ok) {
          const body = await res.json().catch(() => ({ error: "Error desconocido" }));
          setError({
            status: res.status,
            message: body.error || "Error al cargar la colección",
          });
          return;
        }
        const collection: CollectionData = await res.json();
        setData(collection);
      } catch {
        setError({ status: 500, message: "Error de conexión" });
      } finally {
        setIsLoading(false);
      }
    }
    fetchCollection();
  }, [token]);

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Cargando colección...</p>
        </div>
      </div>
    );
  }

  // Error states
  if (error) {
    const is404 = error.status === 404;
    const is410 = error.status === 410;

    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full text-center space-y-4"
        >
          <div
            className={cn(
              "mx-auto w-16 h-16 rounded-2xl flex items-center justify-center",
              is410
                ? "bg-amber-500/10"
                : is404
                  ? "bg-red-500/10"
                  : "bg-red-500/10"
            )}
          >
            {is410 ? (
              <Clock className="h-8 w-8 text-amber-500" />
            ) : is404 ? (
              <Link2Off className="h-8 w-8 text-red-500" />
            ) : (
              <AlertCircle className="h-8 w-8 text-red-500" />
            )}
          </div>
          <h1 className="text-2xl font-bold text-foreground">
            {is410
              ? "Enlace expirado"
              : is404
                ? "Colección no encontrada"
                : "Error"}
          </h1>
          <p className="text-muted-foreground">
            {is410
              ? "Este enlace compartido ha expirado y ya no está disponible."
              : is404
                ? "Esta colección no existe o ha sido desactivada."
                : error.message}
          </p>
          <div className="pt-4">
            <a
              href="/"
              className="text-sm text-primary hover:underline"
            >
              Ir a Stacklume
            </a>
          </div>
        </motion.div>
      </div>
    );
  }

  if (!data) return null;

  const collectionColor = resolveColor(data.color);
  const isCategory = data.type === "category";

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/60 bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: `${collectionColor}20` }}
              >
                {isCategory ? (
                  <FolderOpen
                    className="h-5 w-5"
                    style={{ color: collectionColor }}
                  />
                ) : (
                  <Tag
                    className="h-5 w-5"
                    style={{ color: collectionColor }}
                  />
                )}
              </div>
              <div>
                <h1 className="text-lg font-semibold text-foreground">
                  {data.name}
                </h1>
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className="text-[10px] px-1.5 py-0"
                    style={{
                      borderColor: `${collectionColor}40`,
                      color: collectionColor,
                    }}
                  >
                    {isCategory ? "Categoría" : "Etiqueta"}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {data.links.length}{" "}
                    {data.links.length === 1 ? "enlace" : "enlaces"}
                  </span>
                </div>
              </div>
            </div>

            {/* Branding */}
            <a
              href="/"
              className="text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors flex items-center gap-1.5"
            >
              <span className="hidden sm:inline">Compartido con</span>
              <span className="font-semibold text-foreground/60">Stacklume</span>
            </a>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {data.links.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16"
          >
            <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
              <Link2Off className="h-8 w-8 text-muted-foreground/30" />
            </div>
            <h2 className="text-lg font-medium text-foreground mb-1">
              Sin enlaces
            </h2>
            <p className="text-sm text-muted-foreground">
              Esta colección no contiene enlaces todavía.
            </p>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence>
              {data.links.map((link, index) => (
                <motion.div
                  key={link.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.04 }}
                >
                  <LinkCard link={link} />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border/40 py-6 mt-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-xs text-muted-foreground/40">
            Colección compartida mediante{" "}
            <a href="/" className="hover:text-muted-foreground transition-colors">
              Stacklume
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
