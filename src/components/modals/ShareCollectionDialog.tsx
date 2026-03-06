"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Copy,
  Check,
  Link2,
  Loader2,
  Trash2,
  CalendarIcon,
  Share2,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { getCsrfHeaders } from "@/hooks/useCsrf";
import { cn } from "@/lib/utils";
import { openExternalUrl } from "@/lib/desktop";
import { motion, AnimatePresence } from "motion/react";
import { useTranslation } from "@/lib/i18n";

interface SharedCollection {
  id: string;
  type: string;
  referenceId: string;
  shareToken: string;
  isActive: boolean;
  createdAt: string;
  expiresAt: string | null;
}

interface ShareCollectionDialogProps {
  type: "category" | "tag";
  referenceId: string;
  name: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ShareCollectionDialog({
  type,
  referenceId,
  name,
  open,
  onOpenChange,
}: ShareCollectionDialogProps) {
  const { t } = useTranslation();
  const [existingShare, setExistingShare] = useState<SharedCollection | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isDeactivating, setIsDeactivating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [useExpiration, setUseExpiration] = useState(false);
  const [expirationDate, setExpirationDate] = useState("");

  // Set default expiration to 7 days from now
  const getDefaultExpiration = useCallback(() => {
    const date = new Date();
    date.setDate(date.getDate() + 7);
    return date.toISOString().split("T")[0];
  }, []);

  // Fetch existing share for this item
  const fetchExistingShare = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/shared", {
        credentials: "include",
        cache: "no-store",
      });
      if (!res.ok) throw new Error(t("share.errorFetch"));
      const collections: SharedCollection[] = await res.json();
      const existing = collections.find(
        (c) => c.type === type && c.referenceId === referenceId && c.isActive
      );
      setExistingShare(existing || null);
    } catch (error) {
      console.log("Error fetching shared collections:", error);
      toast.error(t("share.errorFetch"));
    } finally {
      setIsLoading(false);
    }
  }, [type, referenceId]);

  useEffect(() => {
    if (open) {
      fetchExistingShare();
      setExpirationDate(getDefaultExpiration());
      setCopied(false);
    }
  }, [open, fetchExistingShare, getDefaultExpiration]);

  const shareUrl = existingShare
    ? `${window.location.origin}/shared/${existingShare.shareToken}`
    : "";

  const handleCreate = async () => {
    setIsCreating(true);
    try {
      const body: Record<string, unknown> = { type, referenceId };
      if (useExpiration && expirationDate) {
        body.expiresAt = new Date(expirationDate).toISOString();
      }
      const res = await fetch("/api/shared", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getCsrfHeaders(),
        },
        credentials: "include",
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || t("share.errorCreate"));
      }
      const created: SharedCollection = await res.json();
      setExistingShare(created);
      toast.success(t("share.successCreate"));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error desconocido";
      toast.error(message);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeactivate = async () => {
    if (!existingShare) return;
    setIsDeactivating(true);
    try {
      const res = await fetch(`/api/shared?id=${existingShare.id}`, {
        method: "DELETE",
        headers: getCsrfHeaders(),
        credentials: "include",
      });
      if (!res.ok) throw new Error(t("share.errorDeactivate"));
      setExistingShare(null);
      toast.success(t("share.successDeactivate"));
    } catch {
      toast.error(t("share.errorDeactivate"));
    } finally {
      setIsDeactivating(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success(t("share.successCopy"));
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(t("share.errorCopy"));
    }
  };

  const typeLabel = type === "category" ? t("share.typeCategory") : t("share.typeTag");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5 text-primary" />
            {t("share.title", { type: typeLabel })}
          </DialogTitle>
          <DialogDescription>
            {t("share.description", { type: typeLabel, name })}
          </DialogDescription>
        </DialogHeader>

        <AnimatePresence mode="wait">
          {isLoading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center justify-center py-8"
            >
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </motion.div>
          ) : existingShare ? (
            <motion.div
              key="shared"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              {/* Status badge */}
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className="border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                >
                  <Link2 className="h-3 w-3 mr-1" />
                  {t("share.active")}
                </Badge>
                {existingShare.expiresAt && (
                  <Badge variant="outline" className="text-muted-foreground">
                    <CalendarIcon className="h-3 w-3 mr-1" />
                    {t("share.expires", { date: new Date(existingShare.expiresAt).toLocaleDateString(
                      "es-ES",
                      { day: "numeric", month: "short", year: "numeric" }
                    ) })}
                  </Badge>
                )}
              </div>

              {/* Share URL */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">
                  {t("share.publicLink")}
                </Label>
                <div className="flex gap-2">
                  <Input
                    readOnly
                    value={shareUrl}
                    className="text-xs font-mono bg-muted/50"
                    onClick={(e) => (e.target as HTMLInputElement).select()}
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleCopy}
                    className="shrink-0"
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-emerald-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Open link */}
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-muted-foreground hover:text-foreground"
                onClick={() => void openExternalUrl(shareUrl)}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                {t("share.openNewTab")}
              </Button>

              <Separator />

              {/* Deactivate */}
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  {t("share.deactivateHint")}
                </p>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDeactivate}
                  disabled={isDeactivating}
                >
                  {isDeactivating ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                  ) : (
                    <Trash2 className="h-4 w-4 mr-1" />
                  )}
                  {t("share.deactivate")}
                </Button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="create"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              <div className="rounded-lg border border-dashed border-border/60 bg-muted/30 p-4 text-center">
                <Share2 className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">
                  {t("share.noShareYet", { type: typeLabel })}
                </p>
              </div>

              {/* Expiration option */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label
                    htmlFor="use-expiration"
                    className="text-sm cursor-pointer"
                  >
                    {t("share.setExpiration")}
                  </Label>
                  <Switch
                    id="use-expiration"
                    checked={useExpiration}
                    onCheckedChange={setUseExpiration}
                  />
                </div>

                <AnimatePresence>
                  {useExpiration && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.15 }}
                      className="overflow-hidden"
                    >
                      <Input
                        type="date"
                        value={expirationDate}
                        onChange={(e) => setExpirationDate(e.target.value)}
                        min={new Date().toISOString().split("T")[0]}
                        className="w-full"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        {t("share.expirationHint")}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {!isLoading && !existingShare && (
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              {t("btn.cancel")}
            </Button>
            <Button onClick={handleCreate} disabled={isCreating}>
              {isCreating ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Link2 className="h-4 w-4 mr-2" />
              )}
              {t("share.createLink")}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
