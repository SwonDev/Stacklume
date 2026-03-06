"use client"

import * as React from "react"
import { useState, useMemo } from "react"
import { CheckIcon, PlusCircleIcon, ChevronDownIcon, XIcon } from "lucide-react"
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
import { Badge } from "@/components/ui/badge"
import { useLinksStore } from "@/stores/links-store"
import { cn } from "@/lib/utils"
import { useTranslation } from "@/lib/i18n"
import type { Category } from "@/lib/db/schema"

// Mapa de nombres Tailwind a hex para compatibilidad con categorías antiguas
const COLOR_MAP: Record<string, string> = {
  red: "#ef4444", orange: "#f97316", amber: "#f59e0b", yellow: "#eab308",
  gold: "#d4a853", lime: "#84cc16", green: "#22c55e", emerald: "#10b981",
  teal: "#14b8a6", cyan: "#06b6d4", sky: "#0ea5e9", blue: "#3b82f6",
  indigo: "#6366f1", violet: "#8b5cf6", purple: "#a855f7", fuchsia: "#d946ef",
  pink: "#ec4899", rose: "#f43f5e", slate: "#64748b", gray: "#6b7280",
  zinc: "#71717a", stone: "#78716c",
}

function resolveColor(color: string): string {
  return COLOR_MAP[color] ?? color
}

export interface MultiCategorySelectorProps {
  selectedCategoryIds: string[]
  onCategoriesChange: (categoryIds: string[]) => void
  placeholder?: string
  className?: string
}

export function MultiCategorySelector({
  selectedCategoryIds,
  onCategoriesChange,
  placeholder,
  className,
}: MultiCategorySelectorProps) {
  const { t } = useTranslation()
  const resolvedPlaceholder = placeholder ?? t("categorySelector.placeholder")
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const { categories, setAddCategoryModalOpen } = useLinksStore()

  const selectedCategories = useMemo(
    () => categories.filter((c: Category) => selectedCategoryIds.includes(c.id)),
    [categories, selectedCategoryIds]
  )

  // Build tree structure for display
  const { rootCategories, childrenMap } = useMemo(() => {
    const childrenMap = new Map<string, Category[]>()
    const roots: Category[] = []

    const sorted = [...categories].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))

    for (const cat of sorted) {
      const catParentId = (cat as Category & { parentId?: string | null }).parentId
      if (catParentId) {
        const siblings = childrenMap.get(catParentId) || []
        siblings.push(cat)
        childrenMap.set(catParentId, siblings)
      } else {
        roots.push(cat)
      }
    }

    return { rootCategories: roots, childrenMap }
  }, [categories])

  const filteredCategories = useMemo(() => {
    if (!search) return null // null means show tree
    return categories.filter((c: Category) =>
      c.name.toLowerCase().includes(search.toLowerCase())
    )
  }, [categories, search])

  const handleToggleCategory = (categoryId: string) => {
    if (selectedCategoryIds.includes(categoryId)) {
      onCategoriesChange(selectedCategoryIds.filter((id) => id !== categoryId))
    } else {
      onCategoriesChange([...selectedCategoryIds, categoryId])
    }
  }

  const handleRemoveCategory = (categoryId: string, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }
    onCategoriesChange(selectedCategoryIds.filter((id) => id !== categoryId))
  }

  const handleCreateCategory = () => {
    setOpen(false)
    setSearch("")
    setAddCategoryModalOpen(true)
  }

  function renderCategoryItem(category: Category, indent: number = 0) {
    const isSelected = selectedCategoryIds.includes(category.id)
    const children = childrenMap.get(category.id) || []

    return (
      <React.Fragment key={category.id}>
        <CommandItem
          value={category.id}
          onSelect={() => handleToggleCategory(category.id)}
          className="cursor-pointer"
        >
          {indent > 0 && (
            <span style={{ width: indent * 16 }} className="flex-shrink-0" />
          )}
          <div
            className={cn(
              "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary flex-shrink-0",
              isSelected
                ? "bg-primary text-primary-foreground"
                : "opacity-50 [&_svg]:invisible"
            )}
          >
            <CheckIcon className="h-3 w-3" />
          </div>
          {category.color && (
            <div
              className="w-3 h-3 rounded-full mr-2 flex-shrink-0"
              style={{ backgroundColor: resolveColor(category.color) }}
            />
          )}
          <span className="truncate">{category.name}</span>
        </CommandItem>
        {children.map((child) => renderCategoryItem(child, indent + 1))}
      </React.Fragment>
    )
  }

  return (
    <div className={cn("space-y-2", className)}>
      <Popover open={open} onOpenChange={(o) => { setOpen(o); if (!o) setSearch("") }}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn("w-full justify-between text-left font-normal min-h-9", className)}
          >
            {selectedCategories.length > 0 ? (
              <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                {selectedCategories.slice(0, 3).map((cat) => (
                  <Badge
                    key={cat.id}
                    variant="secondary"
                    className="text-xs px-1.5 py-0 h-5 gap-1 flex-shrink-0"
                  >
                    {cat.color && (
                      <div
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: resolveColor(cat.color) }}
                      />
                    )}
                    <span className="truncate max-w-[80px]">{cat.name}</span>
                    <XIcon
                      className="h-3 w-3 opacity-50 hover:opacity-100 cursor-pointer flex-shrink-0"
                      onClick={(e) => handleRemoveCategory(cat.id, e)}
                    />
                  </Badge>
                ))}
                {selectedCategories.length > 3 && (
                  <Badge variant="secondary" className="text-xs px-1.5 py-0 h-5">
                    +{selectedCategories.length - 3}
                  </Badge>
                )}
              </div>
            ) : (
              <span className="text-muted-foreground truncate">{resolvedPlaceholder}</span>
            )}
            <ChevronDownIcon className="h-4 w-4 shrink-0 opacity-50 ml-2" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[300px] p-0" align="start">
          {/* Captura wheel para evitar que react-remove-scroll del Dialog la intercepte */}
          <div onWheel={(e) => { e.stopPropagation(); e.nativeEvent.stopImmediatePropagation(); }}>
            <Command shouldFilter={false}>
              <CommandInput
                placeholder={t("categorySelector.search")}
                value={search}
                onValueChange={setSearch}
              />
              <CommandList>
                <CommandEmpty>
                  <div className="flex flex-col items-center gap-2 py-6">
                    <p className="text-sm text-muted-foreground">{t("categorySelector.empty")}</p>
                    {search && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleCreateCategory}
                        className="h-8"
                      >
                        <PlusCircleIcon className="mr-2 h-4 w-4" />
                        {t("categorySelector.createFromSearch", { search })}
                      </Button>
                    )}
                  </div>
                </CommandEmpty>

                {/* Flat list when searching, tree when not */}
                {filteredCategories ? (
                  filteredCategories.length > 0 && (
                    <CommandGroup heading={t("categorySelector.heading")}>
                      {filteredCategories.map((category: Category) => {
                        const isSelected = selectedCategoryIds.includes(category.id)
                        return (
                          <CommandItem
                            key={category.id}
                            value={category.id}
                            onSelect={() => handleToggleCategory(category.id)}
                            className="cursor-pointer"
                          >
                            <div
                              className={cn(
                                "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary flex-shrink-0",
                                isSelected
                                  ? "bg-primary text-primary-foreground"
                                  : "opacity-50 [&_svg]:invisible"
                              )}
                            >
                              <CheckIcon className="h-3 w-3" />
                            </div>
                            {category.color && (
                              <div
                                className="w-3 h-3 rounded-full mr-2 flex-shrink-0"
                                style={{ backgroundColor: resolveColor(category.color) }}
                              />
                            )}
                            <span className="truncate">{category.name}</span>
                          </CommandItem>
                        )
                      })}
                    </CommandGroup>
                  )
                ) : (
                  rootCategories.length > 0 && (
                    <CommandGroup heading={t("categorySelector.heading")}>
                      {rootCategories.map((category) => renderCategoryItem(category, 0))}
                    </CommandGroup>
                  )
                )}

                <CommandSeparator />

                <CommandGroup>
                  <CommandItem
                    onSelect={handleCreateCategory}
                    className="cursor-pointer justify-center text-primary"
                  >
                    <PlusCircleIcon className="mr-2 h-4 w-4" />
                    {t("categorySelector.createNew")}
                  </CommandItem>
                </CommandGroup>
              </CommandList>
            </Command>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
