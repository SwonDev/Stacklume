"use client";

import { motion } from "motion/react";
import {
  Link2,
  Grid3X3,
  FolderOpen,
  Search,
  Tag,
  Plus,
  FileUp,
  Sparkles,
  LayoutGrid,
  BookMarked,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSettingsStore } from "@/stores/settings-store";
import { cn } from "@/lib/utils";

export type EmptyStateVariant =
  | "no-links"
  | "no-widgets"
  | "no-categories"
  | "no-tags"
  | "no-search-results"
  | "no-favorites"
  | "no-recent"
  | "custom";

interface EmptyStateProps {
  variant?: EmptyStateVariant;
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  action?: {
    label: string;
    onClick: () => void;
    variant?: "default" | "outline" | "ghost";
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
  size?: "sm" | "md" | "lg";
}

// Predefined configurations for each variant
const VARIANT_CONFIGS: Record<
  Exclude<EmptyStateVariant, "custom">,
  {
    icon: React.ReactNode;
    title: string;
    description: string;
    actionLabel?: string;
    secondaryActionLabel?: string;
  }
> = {
  "no-links": {
    icon: <Link2 className="w-8 h-8" />,
    title: "No hay enlaces",
    description:
      "Empieza agregando tu primer enlace o importa tus marcadores del navegador.",
    actionLabel: "Agregar enlace",
    secondaryActionLabel: "Importar marcadores",
  },
  "no-widgets": {
    icon: <LayoutGrid className="w-8 h-8" />,
    title: "No hay widgets",
    description:
      "Personaliza tu panel agregando widgets. Hay mas de 120 tipos disponibles.",
    actionLabel: "Agregar widget",
  },
  "no-categories": {
    icon: <FolderOpen className="w-8 h-8" />,
    title: "No hay categorias",
    description:
      "Organiza tus enlaces creando categorias. Te ayudaran a encontrar todo mas rapido.",
    actionLabel: "Crear categoria",
  },
  "no-tags": {
    icon: <Tag className="w-8 h-8" />,
    title: "No hay etiquetas",
    description:
      "Las etiquetas permiten clasificar enlaces de forma flexible y encontrarlos facilmente.",
    actionLabel: "Crear etiqueta",
  },
  "no-search-results": {
    icon: <Search className="w-8 h-8" />,
    title: "Sin resultados",
    description:
      "No encontramos nada que coincida con tu busqueda. Intenta con otros terminos o limpia los filtros.",
    actionLabel: "Limpiar busqueda",
  },
  "no-favorites": {
    icon: <BookMarked className="w-8 h-8" />,
    title: "No hay favoritos",
    description:
      "Marca enlaces como favoritos para acceder a ellos rapidamente desde aqui.",
  },
  "no-recent": {
    icon: <Sparkles className="w-8 h-8" />,
    title: "No hay enlaces recientes",
    description:
      "Los enlaces que agregues apareceran aqui ordenados por fecha.",
    actionLabel: "Agregar primer enlace",
  },
};

export function EmptyState({
  variant = "custom",
  title,
  description,
  icon,
  action,
  secondaryAction,
  className,
  size = "md",
}: EmptyStateProps) {
  const reduceMotion = useSettingsStore((state) => state.reduceMotion);

  // Get config from variant or use custom props
  const config = variant !== "custom" ? VARIANT_CONFIGS[variant] : null;
  const finalTitle = title || config?.title || "No hay contenido";
  const finalDescription =
    description || config?.description || "No hay nada que mostrar aqui.";
  const finalIcon = icon || config?.icon || <Grid3X3 className="w-8 h-8" />;

  // Size classes
  const sizeClasses = {
    sm: {
      container: "py-6 px-4",
      iconContainer: "w-12 h-12 mb-3",
      icon: "w-5 h-5",
      title: "text-sm",
      description: "text-xs max-w-[200px]",
    },
    md: {
      container: "py-10 px-6",
      iconContainer: "w-16 h-16 mb-4",
      icon: "w-8 h-8",
      title: "text-lg",
      description: "text-sm max-w-sm",
    },
    lg: {
      container: "py-16 px-8",
      iconContainer: "w-20 h-20 mb-6",
      icon: "w-10 h-10",
      title: "text-xl",
      description: "text-base max-w-md",
    },
  };

  const classes = sizeClasses[size];

  return (
    <motion.div
      initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 10 }}
      animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
      transition={{ duration: reduceMotion ? 0.1 : 0.3 }}
      className={cn(
        "flex flex-col items-center justify-center text-center",
        classes.container,
        className
      )}
      role="status"
      aria-label={finalTitle}
    >
      {/* Icon */}
      <motion.div
        initial={reduceMotion ? {} : { scale: 0.8 }}
        animate={reduceMotion ? {} : { scale: 1 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className={cn(
          "rounded-full bg-secondary/50 flex items-center justify-center",
          "text-muted-foreground",
          classes.iconContainer
        )}
        aria-hidden="true"
      >
        {finalIcon}
      </motion.div>

      {/* Title */}
      <h3
        className={cn(
          "font-medium text-foreground mb-1",
          classes.title
        )}
      >
        {finalTitle}
      </h3>

      {/* Description */}
      <p
        className={cn(
          "text-muted-foreground mb-4",
          classes.description
        )}
      >
        {finalDescription}
      </p>

      {/* Actions */}
      {(action || secondaryAction || config?.actionLabel) && (
        <div className="flex flex-col sm:flex-row items-center gap-2 mt-2">
          {(action || config?.actionLabel) && (
            <Button
              variant={action?.variant || "default"}
              size={size === "sm" ? "sm" : "default"}
              onClick={action?.onClick}
              className="gap-2"
            >
              <Plus className="w-4 h-4" />
              {action?.label || config?.actionLabel}
            </Button>
          )}
          {(secondaryAction || config?.secondaryActionLabel) && (
            <Button
              variant="outline"
              size={size === "sm" ? "sm" : "default"}
              onClick={secondaryAction?.onClick}
              className="gap-2"
            >
              <FileUp className="w-4 h-4" />
              {secondaryAction?.label || config?.secondaryActionLabel}
            </Button>
          )}
        </div>
      )}
    </motion.div>
  );
}

// Specialized empty state for widgets with visual indicator
interface WidgetEmptyStateProps {
  type?: string;
  onAddWidget?: () => void;
  className?: string;
}

export function WidgetEmptyState({
  type,
  onAddWidget,
  className,
}: WidgetEmptyStateProps) {
  const reduceMotion = useSettingsStore((state) => state.reduceMotion);

  return (
    <motion.div
      initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.95 }}
      animate={reduceMotion ? { opacity: 1 } : { opacity: 1, scale: 1 }}
      className={cn(
        "h-full min-h-[200px] flex flex-col items-center justify-center",
        "border-2 border-dashed border-muted-foreground/20 rounded-lg",
        "bg-muted/30 backdrop-blur-sm",
        "transition-colors hover:border-primary/30 hover:bg-muted/50",
        className
      )}
    >
      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
        <LayoutGrid className="w-6 h-6 text-primary/60" />
      </div>
      <p className="text-sm font-medium text-foreground mb-1">
        {type ? `No hay ${type}` : "Espacio vacio"}
      </p>
      <p className="text-xs text-muted-foreground mb-3">
        Agrega tu primer widget aqui
      </p>
      {onAddWidget && (
        <Button
          variant="outline"
          size="sm"
          onClick={onAddWidget}
          className="gap-2"
        >
          <Plus className="w-4 h-4" />
          Agregar widget
        </Button>
      )}
    </motion.div>
  );
}

// Empty state for search results with filter clear
interface SearchEmptyStateProps {
  query: string;
  filterLabel?: string;
  onClearSearch?: () => void;
  onClearFilter?: () => void;
  className?: string;
}

export function SearchEmptyState({
  query,
  filterLabel,
  onClearSearch,
  onClearFilter,
  className,
}: SearchEmptyStateProps) {
  return (
    <EmptyState
      variant="no-search-results"
      description={
        query
          ? `No hay resultados para "${query}"${
              filterLabel ? ` en "${filterLabel}"` : ""
            }`
          : filterLabel
          ? `No hay widgets que contengan enlaces de "${filterLabel}"`
          : "No hay resultados que mostrar"
      }
      action={
        onClearSearch || onClearFilter
          ? {
              label: "Limpiar filtros",
              onClick: () => {
                onClearSearch?.();
                onClearFilter?.();
              },
              variant: "outline",
            }
          : undefined
      }
      className={className}
      size="md"
    />
  );
}

// Compact inline empty state for small containers
interface InlineEmptyStateProps {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function InlineEmptyState({
  message,
  actionLabel,
  onAction,
  className,
}: InlineEmptyStateProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-center gap-2 py-4 text-sm text-muted-foreground",
        className
      )}
    >
      <span>{message}</span>
      {actionLabel && onAction && (
        <Button
          variant="link"
          size="sm"
          onClick={onAction}
          className="h-auto p-0 text-primary"
        >
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
