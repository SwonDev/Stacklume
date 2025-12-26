"use client"

import * as React from "react"
import { useState } from "react"
import { CheckIcon, PlusCircleIcon, XIcon } from "lucide-react"
import { motion, AnimatePresence } from "motion/react"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"
import { Button } from "@/components/ui/button"
import { TagBadge } from "@/components/ui/tag-badge"
import { useLinksStore } from "@/stores/links-store"
import { cn } from "@/lib/utils"
import type { Tag } from "@/lib/db/schema"

export interface TagSelectorProps {
  selectedTagIds: string[]
  onTagsChange: (tagIds: string[]) => void
  placeholder?: string
  className?: string
}

export function TagSelector({
  selectedTagIds,
  onTagsChange,
  placeholder = "Select tags...",
  className,
}: TagSelectorProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const { tags, setAddTagModalOpen } = useLinksStore()

  const selectedTags = tags.filter((tag: Tag) => selectedTagIds.includes(tag.id))
  const availableTags = tags.filter((tag: Tag) => !selectedTagIds.includes(tag.id))

  const filteredTags = availableTags.filter((tag: Tag) =>
    tag.name.toLowerCase().includes(search.toLowerCase())
  )

  const handleSelectTag = (tagId: string) => {
    if (selectedTagIds.includes(tagId)) {
      onTagsChange(selectedTagIds.filter((id) => id !== tagId))
    } else {
      onTagsChange([...selectedTagIds, tagId])
    }
  }

  const handleRemoveTag = (tagId: string) => {
    onTagsChange(selectedTagIds.filter((id) => id !== tagId))
  }

  const handleCreateTag = () => {
    setOpen(false)
    setAddTagModalOpen(true)
  }

  return (
    <div className={cn("space-y-2", className)}>
      {/* Selected Tags Display */}
      <AnimatePresence mode="popLayout">
        {selectedTags.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="flex flex-wrap gap-1.5"
          >
            {selectedTags.map((tag: Tag) => (
              <motion.div
                key={tag.id}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                layout
              >
                <TagBadge
                  name={tag.name}
                  color={tag.color || "blue"}
                  size="sm"
                  onRemove={() => handleRemoveTag(tag.id)}
                />
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tag Selector Popover */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-start text-left font-normal"
          >
            <PlusCircleIcon className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <span className="truncate">{placeholder}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[300px] p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Search tags..."
              value={search}
              onValueChange={setSearch}
            />
            <CommandList>
              <CommandEmpty>
                <div className="flex flex-col items-center gap-2 py-6">
                  <p className="text-sm text-muted-foreground">No tags found</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCreateTag}
                    className="h-8"
                  >
                    <PlusCircleIcon className="mr-2 h-4 w-4" />
                    Create &quot;{search}&quot;
                  </Button>
                </div>
              </CommandEmpty>

              {filteredTags.length > 0 && (
                <CommandGroup heading="Available Tags">
                  {filteredTags.map((tag: Tag) => (
                    <CommandItem
                      key={tag.id}
                      value={tag.id}
                      onSelect={() => handleSelectTag(tag.id)}
                      className="cursor-pointer"
                    >
                      <div
                        className={cn(
                          "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                          selectedTagIds.includes(tag.id)
                            ? "bg-primary text-primary-foreground"
                            : "opacity-50 [&_svg]:invisible"
                        )}
                      >
                        <CheckIcon className="h-3 w-3" />
                      </div>
                      <TagBadge
                        name={tag.name}
                        color={tag.color || "blue"}
                        size="sm"
                      />
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}

              {selectedTags.length > 0 && filteredTags.length > 0 && (
                <CommandSeparator />
              )}

              {selectedTags.length > 0 && (
                <CommandGroup heading="Selected Tags">
                  {selectedTags.map((tag: Tag) => (
                    <CommandItem
                      key={tag.id}
                      value={tag.id}
                      onSelect={() => handleRemoveTag(tag.id)}
                      className="cursor-pointer"
                    >
                      <div className="mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary bg-primary text-primary-foreground">
                        <CheckIcon className="h-3 w-3" />
                      </div>
                      <TagBadge
                        name={tag.name}
                        color={tag.color || "blue"}
                        size="sm"
                      />
                      <XIcon className="ml-auto h-3 w-3 opacity-50" />
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}

              <CommandSeparator />

              <CommandGroup>
                <CommandItem
                  onSelect={handleCreateTag}
                  className="cursor-pointer justify-center text-primary"
                >
                  <PlusCircleIcon className="mr-2 h-4 w-4" />
                  Create New Tag
                </CommandItem>
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  )
}
