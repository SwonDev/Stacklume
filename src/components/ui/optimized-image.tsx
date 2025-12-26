"use client";

import { useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface OptimizedImageProps {
  src: string | null | undefined;
  alt: string;
  className?: string;
  fill?: boolean;
  width?: number;
  height?: number;
  priority?: boolean;
  fallback?: React.ReactNode;
  onError?: () => void;
}

/**
 * OptimizedImage component that uses Next.js Image optimization
 * with graceful fallback for loading states and errors
 */
export function OptimizedImage({
  src,
  alt,
  className,
  fill = false,
  width,
  height,
  priority = false,
  fallback,
  onError,
}: OptimizedImageProps) {
  const [error, setError] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // If no src or error occurred, show fallback
  if (!src || error) {
    return fallback ? <>{fallback}</> : null;
  }

  // Check if the URL is from a configured domain (next/image supported)
  const isOptimizable = isOptimizableDomain(src);

  if (!isOptimizable) {
    // Fall back to regular img for unconfigured domains
    return (
      <img
        src={src}
        alt={alt}
        className={cn(className, !loaded && "opacity-0")}
        loading={priority ? "eager" : "lazy"}
        onLoad={() => setLoaded(true)}
        onError={() => {
          setError(true);
          onError?.();
        }}
      />
    );
  }

  // Use Next.js Image for optimized loading
  if (fill) {
    return (
      <Image
        src={src}
        alt={alt}
        fill
        className={cn(className, "object-cover")}
        priority={priority}
        onLoad={() => setLoaded(true)}
        onError={() => {
          setError(true);
          onError?.();
        }}
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
      />
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={width || 100}
      height={height || 100}
      className={className}
      priority={priority}
      onLoad={() => setLoaded(true)}
      onError={() => {
        setError(true);
        onError?.();
      }}
    />
  );
}

/**
 * Check if a URL is from a domain configured in next.config.ts
 */
function isOptimizableDomain(url: string): boolean {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname;

    // List of domains configured in next.config.ts
    const optimizableDomains = [
      "img.youtube.com",
      "i.ytimg.com",
      "cdn.cloudflare.steamstatic.com",
      "steamcdn-a.akamaihd.net",
      "i.scdn.co",
      "mosaic.scdn.co",
      "avatars.githubusercontent.com",
      "opengraph.githubassets.com",
      "repository-images.githubusercontent.com",
      "raw.githubusercontent.com",
      "pbs.twimg.com",
      "abs.twimg.com",
    ];

    // Check exact match or wildcard match
    return optimizableDomains.some(domain => {
      if (domain.startsWith("*.")) {
        // Wildcard domain - check if hostname ends with the domain
        const baseDomain = domain.slice(2);
        return hostname === baseDomain || hostname.endsWith("." + baseDomain);
      }
      return hostname === domain;
    });
  } catch {
    return false;
  }
}

/**
 * Favicon component with optimization and fallback
 */
interface FaviconProps {
  src: string | null | undefined;
  alt?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function Favicon({ src, alt = "", size = "md", className }: FaviconProps) {
  const [error, setError] = useState(false);

  const sizeClasses = {
    sm: "w-3 h-3",
    md: "w-4 h-4",
    lg: "w-5 h-5",
  };

  if (!src || error) {
    return null;
  }

  return (
    <img
      src={src}
      alt={alt}
      className={cn(sizeClasses[size], "rounded-sm", className)}
      loading="lazy"
      onError={() => setError(true)}
    />
  );
}

/**
 * Thumbnail component optimized for link previews
 */
interface ThumbnailProps {
  src: string | null | undefined;
  alt: string;
  className?: string;
  aspectRatio?: "video" | "square" | "wide";
  fallbackIcon?: React.ReactNode;
}

export function Thumbnail({
  src,
  alt,
  className,
  aspectRatio = "video",
  fallbackIcon,
}: ThumbnailProps) {
  const [error, setError] = useState(false);

  const aspectClasses = {
    video: "aspect-video",
    square: "aspect-square",
    wide: "aspect-[2/1]",
  };

  if (!src || error) {
    return (
      <div
        className={cn(
          "bg-secondary flex items-center justify-center",
          aspectClasses[aspectRatio],
          className
        )}
      >
        {fallbackIcon}
      </div>
    );
  }

  // Check if optimizable
  const isOptimizable = isOptimizableDomain(src);

  if (isOptimizable) {
    return (
      <div className={cn("relative overflow-hidden", aspectClasses[aspectRatio], className)}>
        <Image
          src={src}
          alt={alt}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          onError={() => setError(true)}
        />
      </div>
    );
  }

  return (
    <div className={cn("relative overflow-hidden", aspectClasses[aspectRatio], className)}>
      <img
        src={src}
        alt={alt}
        className="w-full h-full object-cover"
        loading="lazy"
        onError={() => setError(true)}
      />
    </div>
  );
}
