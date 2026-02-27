"use client"

import * as React from "react"
import { useState } from "react"
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
import { useLinksStore } from "@/stores/links-store"
import { cn } from "@/lib/utils"
import type { Category } from "@/lib/db/schema"

export interface CategorySelectorProps {
  selectedCategoryId: string | null | undefined
  onCategoryChange: (categoryId: string | null) => void
  placeholder?: string
  className?: string
}

export function CategorySelector({
  selectedCategoryId,
  onCategoryChange,
  placeholder = "Selecciona una categoría...",
  className,
}: CategorySelectorProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const { categories, setAddCategoryModalOpen } = useLinksStore()

  const selectedCategory = categories.find((c: Category) => c.id === selectedCategoryId) || null

  const filteredCategories = categories.filter((c: Category) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  )

  const handleSelectCategory = (categoryId: string) => {
    if (selectedCategoryId === categoryId) {
      onCategoryChange(null)
    } else {
      onCategoryChange(categoryId)
    }
    setOpen(false)
    setSearch("")
  }

  const handleClearCategory = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    onCategoryChange(null)
  }

  const handleCreateCategory = () => {
    setOpen(false)
    setSearch("")
    setAddCategoryModalOpen(true)
  }

  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (!o) setSearch("") }}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between text-left font-normal", className)}
        >
          {selectedCategory ? (
            <div className="flex items-center gap-2 min-w-0">
              {selectedCategory.color && (
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: selectedCategory.color }}
                />
              )}
              <span className="truncate">{selectedCategory.name}</span>
            </div>
          ) : (
            <span className="text-muted-foreground truncate">{placeholder}</span>
          )}
          <div className="flex items-center gap-1 ml-2 flex-shrink-0">
            {selectedCategory && (
              <div
                role="button"
                tabIndex={0}
                onClick={handleClearCategory}
                onKeyDown={(e) => e.key === "Enter" && handleClearCategory(e as unknown as React.MouseEvent)}
                className="rounded hover:bg-muted p-0.5"
              >
                <XIcon className="h-3 w-3 opacity-50 hover:opacity-100" />
              </div>
            )}
            <ChevronDownIcon className="h-4 w-4 shrink-0 opacity-50" />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Buscar categoría..."
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>
              <div className="flex flex-col items-center gap-2 py-6">
                <p className="text-sm text-muted-foreground">No se encontraron categorías</p>
                {search && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCreateCategory}
                    className="h-8"
                  >
                    <PlusCircleIcon className="mr-2 h-4 w-4" />
                    Crear &quot;{search}&quot;
                  </Button>
                )}
              </div>
            </CommandEmpty>

            {filteredCategories.length > 0 && (
              <CommandGroup heading="Categorías">
                {filteredCategories.map((category: Category) => (
                  <CommandItem
                    key={category.id}
                    value={category.id}
                    onSelect={() => handleSelectCategory(category.id)}
                    className="cursor-pointer"
                  >
                    <div
                      className={cn(
                        "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                        selectedCategoryId === category.id
                          ? "bg-primary text-primary-foreground"
                          : "opacity-50 [&_svg]:invisible"
                      )}
                    >
                      <CheckIcon className="h-3 w-3" />
                    </div>
                    {category.color && (
                      <div
                        className="w-3 h-3 rounded-full mr-2 flex-shrink-0"
                        style={{ backgroundColor: category.color }}
                      />
                    )}
                    <span className="truncate">{category.name}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            <CommandSeparator />

            <CommandGroup>
              <CommandItem
                onSelect={handleCreateCategory}
                className="cursor-pointer justify-center text-primary"
              >
                <PlusCircleIcon className="mr-2 h-4 w-4" />
                Crear nueva categoría
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
