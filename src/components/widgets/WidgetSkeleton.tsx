"use client";

import { cn } from "@/lib/utils";

interface WidgetSkeletonProps {
  variant?: "list" | "stats" | "clock" | "notes" | "default";
  className?: string;
}

function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-muted/50",
        className
      )}
    />
  );
}

export function WidgetSkeleton({ variant = "default", className }: WidgetSkeletonProps) {
  if (variant === "list") {
    return (
      <div className={cn("@container h-full w-full p-3 space-y-2", className)}>
        {[...Array(4)].map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="h-8 w-8 rounded-md shrink-0" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3 w-3/4" />
              <Skeleton className="h-2 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (variant === "stats") {
    return (
      <div className={cn("@container h-full w-full p-3", className)}>
        <div className="grid grid-cols-2 gap-2 h-full">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex flex-col items-center justify-center gap-2 p-3 rounded-lg bg-secondary/30">
              <Skeleton className="h-10 w-10 rounded-full" />
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-6 w-8" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (variant === "clock") {
    return (
      <div className={cn("@container h-full w-full flex flex-col items-center justify-center p-4", className)}>
        <Skeleton className="h-16 w-40 mb-2" />
        <Skeleton className="h-4 w-24" />
      </div>
    );
  }

  if (variant === "notes") {
    return (
      <div className={cn("@container h-full w-full p-3 space-y-2", className)}>
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-4/6" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    );
  }

  // Default generic skeleton
  return (
    <div className={cn("@container h-full w-full p-4 flex flex-col items-center justify-center", className)}>
      <Skeleton className="h-12 w-12 rounded-full mb-3" />
      <Skeleton className="h-4 w-24 mb-2" />
      <Skeleton className="h-3 w-16" />
    </div>
  );
}

// Individual skeleton components for custom use
export function ListItemSkeleton() {
  return (
    <div className="flex items-center gap-3 p-2">
      <Skeleton className="h-8 w-8 rounded-md shrink-0" />
      <div className="flex-1 space-y-1.5">
        <Skeleton className="h-3.5 w-3/4" />
        <Skeleton className="h-2.5 w-1/2" />
      </div>
    </div>
  );
}

export function StatItemSkeleton() {
  return (
    <div className="flex flex-col items-center justify-center gap-2 p-3 rounded-lg bg-secondary/30">
      <Skeleton className="h-10 w-10 rounded-full" />
      <Skeleton className="h-3 w-14" />
      <Skeleton className="h-5 w-8" />
    </div>
  );
}
