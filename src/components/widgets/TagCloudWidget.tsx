"use client";

import { useMemo } from "react";
import { Tag as TagIcon } from "lucide-react";
import { useLinksStore } from "@/stores/links-store";
import { useLayoutStore } from "@/stores/layout-store";
import type { Tag } from "@/lib/db/schema";
import type { Widget } from "@/types/widget";

interface TagCloudWidgetProps {
  widget?: Widget;
}

interface TagWithFrequency extends Tag {
  count: number;
  sizeClass: string;
}

// Seeded random number generator for stable shuffling
function seededRandom(seed: number): () => number {
  return () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
}

// Generate a stable seed from tag IDs
function generateSeedFromTags(tags: { id: string }[]): number {
  return tags.reduce((acc, tag) => {
    let hash = 0;
    for (let i = 0; i < tag.id.length; i++) {
      hash = ((hash << 5) - hash) + tag.id.charCodeAt(i);
      hash = hash & hash;
    }
    return acc + Math.abs(hash);
  }, 0);
}

export function TagCloudWidget({ widget: _widget }: TagCloudWidgetProps) {
  const tags = useLinksStore((state) => state.tags);
  const linkTags = useLinksStore((state) => state.linkTags);
  const setActiveFilter = useLayoutStore((state) => state.setActiveFilter);
  const clearFilter = useLayoutStore((state) => state.clearFilter);
  const activeFilter = useLayoutStore((state) => state.activeFilter);

  const tagsWithFrequency = useMemo<TagWithFrequency[]>(() => {
    // Calculate frequency for each tag (tagId is string uuid)
    const tagCountMap = new Map<string, number>();

    linkTags.forEach((linkTag) => {
      const currentCount = tagCountMap.get(linkTag.tagId) || 0;
      tagCountMap.set(linkTag.tagId, currentCount + 1);
    });

    // Map tags with their frequency
    const tagsWithCount = tags.map((tag) => ({
      ...tag,
      count: tagCountMap.get(tag.id) || 0,
    }));

    // Filter out tags with 0 links
    const activeTags = tagsWithCount.filter((tag) => tag.count > 0);

    // Calculate size classes based on frequency
    const maxCount = Math.max(...activeTags.map((t) => t.count), 1);
    const minCount = Math.min(...activeTags.map((t) => t.count));

    const result = activeTags.map((tag) => {
      const normalized = maxCount === minCount
        ? 0.5
        : (tag.count - minCount) / (maxCount - minCount);

      let sizeClass: string;
      if (normalized >= 0.8) {
        sizeClass = "text-2xl font-bold";
      } else if (normalized >= 0.6) {
        sizeClass = "text-xl font-semibold";
      } else if (normalized >= 0.4) {
        sizeClass = "text-lg font-medium";
      } else if (normalized >= 0.2) {
        sizeClass = "text-base";
      } else {
        sizeClass = "text-sm";
      }

      return {
        ...tag,
        sizeClass,
      };
    });

    // Use seeded random for stable shuffling based on tag IDs
    const seed = generateSeedFromTags(result);
    const random = seededRandom(seed);
    return result.sort(() => random() - 0.5);
  }, [tags, linkTags]);

  const handleTagClick = (tag: Tag) => {
    // Toggle filter - if clicking the same tag, clear filter
    if (activeFilter?.type === "tag" && activeFilter.id === tag.id) {
      clearFilter();
    } else {
      setActiveFilter({ type: "tag", id: tag.id, label: tag.name });
    }
  };

  const getTagColorClass = (color: string | null) => {
    if (!color) return "text-muted-foreground hover:text-foreground";

    // Map color names to Tailwind classes
    const colorMap: Record<string, string> = {
      red: "text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300",
      orange: "text-orange-500 hover:text-orange-600 dark:text-orange-400 dark:hover:text-orange-300",
      yellow: "text-yellow-500 hover:text-yellow-600 dark:text-yellow-400 dark:hover:text-yellow-300",
      green: "text-green-500 hover:text-green-600 dark:text-green-400 dark:hover:text-green-300",
      blue: "text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300",
      purple: "text-purple-500 hover:text-purple-600 dark:text-purple-400 dark:hover:text-purple-300",
      pink: "text-pink-500 hover:text-pink-600 dark:text-pink-400 dark:hover:text-pink-300",
      gray: "text-gray-500 hover:text-gray-600 dark:text-gray-400 dark:hover:text-gray-300",
    };

    return colorMap[color.toLowerCase()] || "text-muted-foreground hover:text-foreground";
  };

  if (tagsWithFrequency.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
        <TagIcon className="h-8 w-8 opacity-50" />
        <p className="text-sm">No tags yet</p>
        <p className="text-xs text-center px-4">Add tags to your links to see them here</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-3">
      {/* Header */}
      <div className="flex items-center gap-2 border-b pb-2">
        <TagIcon className="h-4 w-4 text-muted-foreground" />
        <h3 className="font-semibold text-sm">Tag Cloud</h3>
        <span className="ml-auto text-xs text-muted-foreground">
          {tagsWithFrequency.length} {tagsWithFrequency.length === 1 ? "tag" : "tags"}
        </span>
      </div>

      {/* Tag Cloud */}
      <div className="flex-1 overflow-y-auto">
        <div className="flex flex-wrap items-center justify-center gap-3 p-2">
          {tagsWithFrequency.map((tag) => {
            const isActive = activeFilter?.type === "tag" && activeFilter.id === tag.id;

            return (
              <button
                key={tag.id}
                onClick={() => handleTagClick(tag)}
                className={`
                  ${tag.sizeClass}
                  ${getTagColorClass(tag.color)}
                  transition-all duration-200 ease-out
                  hover:scale-110 active:scale-95
                  cursor-pointer
                  rounded-md px-2 py-1
                  ${isActive ? "ring-2 ring-current ring-offset-2 ring-offset-background" : ""}
                `}
                title={`${tag.name} (${tag.count} ${tag.count === 1 ? "link" : "links"})`}
              >
                <span className="inline-flex items-center gap-1">
                  {tag.name}
                  <span className="text-xs opacity-70">
                    {tag.count}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Filter Indicator */}
      {activeFilter?.type === "tag" && (
        <div className="border-t pt-2 text-xs text-muted-foreground text-center">
          Filtering by: {tagsWithFrequency.find((t) => t.id === activeFilter.id)?.name}
        </div>
      )}
    </div>
  );
}
