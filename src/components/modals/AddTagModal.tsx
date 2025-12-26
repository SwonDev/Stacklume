"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { Loader2, TagIcon } from "lucide-react"
import { motion } from "motion/react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { TagBadge, type TagColor } from "@/components/ui/tag-badge"
import { useLinksStore } from "@/stores/links-store"
import { cn } from "@/lib/utils"

const formSchema = z.object({
  name: z
    .string()
    .min(1, "Tag name is required")
    .max(50, "Tag name must be 50 characters or less")
    .regex(/^[a-zA-Z0-9\s-_]+$/, "Only letters, numbers, spaces, hyphens, and underscores allowed"),
})

type FormValues = z.infer<typeof formSchema>

const colorOptions: Array<{ value: TagColor; label: string }> = [
  { value: "red", label: "Red" },
  { value: "orange", label: "Orange" },
  { value: "amber", label: "Amber" },
  { value: "yellow", label: "Yellow" },
  { value: "lime", label: "Lime" },
  { value: "green", label: "Green" },
  { value: "emerald", label: "Emerald" },
  { value: "teal", label: "Teal" },
  { value: "cyan", label: "Cyan" },
  { value: "sky", label: "Sky" },
  { value: "blue", label: "Blue" },
  { value: "indigo", label: "Indigo" },
  { value: "violet", label: "Violet" },
  { value: "purple", label: "Purple" },
  { value: "fuchsia", label: "Fuchsia" },
  { value: "pink", label: "Pink" },
  { value: "rose", label: "Rose" },
  { value: "slate", label: "Slate" },
  { value: "gray", label: "Gray" },
  { value: "zinc", label: "Zinc" },
  { value: "neutral", label: "Neutral" },
  { value: "stone", label: "Stone" },
]

const getColorStyles = (color: TagColor) => {
  const colorMap: Record<TagColor, string> = {
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
  }
  return colorMap[color]
}

export function AddTagModal() {
  const isAddTagModalOpen = useLinksStore((state) => state.isAddTagModalOpen);
  const setAddTagModalOpen = useLinksStore((state) => state.setAddTagModalOpen);
  const addTag = useLinksStore((state) => state.addTag);
  const [isLoading, setIsLoading] = useState(false)
  const [selectedColor, setSelectedColor] = useState<TagColor>("blue")

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
    },
  })

  const tagName = form.watch("name")

  const onSubmit = async (values: FormValues) => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: values.name.trim(),
          color: selectedColor,
        }),
      })

      if (response.ok) {
        const newTag = await response.json()
        addTag(newTag)
        toast.success("Etiqueta creada correctamente")
        handleClose()
      } else {
        const error = await response.json()
        console.error("Error creating tag:", error)
        toast.error("Error al crear la etiqueta")
        form.setError("name", {
          message: error.message || "Failed to create tag",
        })
      }
    } catch (error) {
      console.error("Error creating tag:", error)
      toast.error("Error al guardar la etiqueta")
      form.setError("name", {
        message: "An unexpected error occurred",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    form.reset()
    setSelectedColor("blue")
    setAddTagModalOpen(false)
  }

  return (
    <Dialog open={isAddTagModalOpen} onOpenChange={setAddTagModalOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TagIcon className="w-5 h-5 text-primary" />
            Create New Tag
          </DialogTitle>
          <DialogDescription>
            Create a tag to organize and categorize your links
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Name Field */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tag Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., React, Design, Tutorial"
                      autoFocus
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Color Selection */}
            <div className="space-y-3">
              <label className="text-sm font-medium">Color</label>
              <div className="grid grid-cols-11 gap-2">
                {colorOptions.map((color) => (
                  <motion.button
                    key={color.value}
                    type="button"
                    onClick={() => setSelectedColor(color.value)}
                    className={cn(
                      "w-7 h-7 rounded-full transition-all relative",
                      selectedColor === color.value &&
                        "ring-2 ring-primary ring-offset-2 ring-offset-background"
                    )}
                    style={{
                      backgroundColor: getColorStyles(color.value),
                    }}
                    title={color.label}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    {selectedColor === color.value && (
                      <motion.div
                        layoutId="selectedColor"
                        className="absolute inset-0 rounded-full"
                        transition={{
                          type: "spring",
                          stiffness: 500,
                          damping: 30,
                        }}
                      />
                    )}
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Preview */}
            {tagName && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-2"
              >
                <label className="text-sm font-medium">Preview</label>
                <div className="flex items-center gap-2 p-3 rounded-md bg-muted/50">
                  <TagBadge name={tagName} color={selectedColor} size="md" />
                  <TagBadge name={tagName} color={selectedColor} size="sm" />
                  <TagBadge name={tagName} color={selectedColor} size="lg" />
                </div>
              </motion.div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={handleClose}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Create Tag
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
