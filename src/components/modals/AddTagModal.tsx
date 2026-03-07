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
import { getCsrfHeaders } from "@/hooks/useCsrf"
import { useTranslation } from "@/lib/i18n"

const formSchema = z.object({
  name: z
    .string()
    .min(1, "required")
    .max(50, "max50")
    .regex(/^[a-zA-Z0-9\s-_]+$/, "invalidChars"),
})

type FormValues = z.infer<typeof formSchema>

const colorOptions: Array<{ value: TagColor; labelKey: string }> = [
  { value: "red", labelKey: "color.red" },
  { value: "orange", labelKey: "color.orange" },
  { value: "amber", labelKey: "color.amber" },
  { value: "yellow", labelKey: "color.yellow" },
  { value: "lime", labelKey: "color.lime" },
  { value: "green", labelKey: "color.green" },
  { value: "emerald", labelKey: "color.emerald" },
  { value: "teal", labelKey: "color.teal" },
  { value: "cyan", labelKey: "color.cyan" },
  { value: "sky", labelKey: "color.sky" },
  { value: "blue", labelKey: "color.blue" },
  { value: "indigo", labelKey: "color.indigo" },
  { value: "violet", labelKey: "color.violet" },
  { value: "purple", labelKey: "color.purple" },
  { value: "fuchsia", labelKey: "color.fuchsia" },
  { value: "pink", labelKey: "color.pink" },
  { value: "rose", labelKey: "color.rose" },
  { value: "slate", labelKey: "color.slate" },
  { value: "gray", labelKey: "color.gray" },
  { value: "zinc", labelKey: "color.zinc" },
  { value: "neutral", labelKey: "color.neutral" },
  { value: "stone", labelKey: "color.stone" },
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
  const { t } = useTranslation();
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
        headers: {
          "Content-Type": "application/json",
          ...getCsrfHeaders(),
        },
        credentials: "include",
        body: JSON.stringify({
          name: values.name.trim(),
          color: selectedColor,
        }),
      })

      if (response.ok) {
        const newTag = await response.json()
        addTag(newTag)
        toast.success(t("addTag.successCreate"))
        handleClose()
      } else {
        const error = await response.json()
        console.error("Error creating tag:", error)
        toast.error(t("addTag.errorCreate"))
        form.setError("name", {
          message: error.message || t("addTag.errorCreate"),
        })
      }
    } catch (error) {
      console.error("Error creating tag:", error)
      toast.error(t("addTag.errorSave"))
      form.setError("name", {
        message: t("addTag.unexpectedError"),
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
            {t("addTag.title")}
          </DialogTitle>
          <DialogDescription>
            {t("addTag.description")}
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
                  <FormLabel>{t("addTag.name")}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t("addTag.namePlaceholder")}
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
              <label className="text-sm font-medium">{t("addTag.tagColor")}</label>
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
                    title={t(color.labelKey)}
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
                <label className="text-sm font-medium">{t("addTag.preview")}</label>
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
                {t("btn.cancel")}
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {t("addTag.createTag")}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
