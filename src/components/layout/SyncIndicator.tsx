"use client";

import { useState, useEffect } from "react";
import { Cloud, CloudOff, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";

type SyncStatus = "idle" | "syncing" | "synced" | "error";

export function SyncIndicator() {
  const [status, setStatus] = useState<SyncStatus>("idle");
  const { t } = useTranslation();

  useEffect(() => {
    // Listen for sync events dispatched by API calls
    const handleSyncStart = () => {
      setStatus("syncing");
    };
    const handleSyncDone = () => {
      setStatus("synced");
      // Reset to idle after 2s
      setTimeout(() => setStatus("idle"), 2000);
    };
    const handleSyncError = () => {
      setStatus("error");
      setTimeout(() => setStatus("idle"), 3000);
    };

    window.addEventListener("stacklume:sync-start", handleSyncStart);
    window.addEventListener("stacklume:sync-done", handleSyncDone);
    window.addEventListener("stacklume:sync-error", handleSyncError);

    return () => {
      window.removeEventListener("stacklume:sync-start", handleSyncStart);
      window.removeEventListener("stacklume:sync-done", handleSyncDone);
      window.removeEventListener("stacklume:sync-error", handleSyncError);
    };
  }, []);

  if (status === "idle") return null;

  return (
    <div
      className={cn(
        "flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-medium transition-all",
        status === "syncing" && "bg-blue-500/10 text-blue-500",
        status === "synced" && "bg-green-500/10 text-green-500",
        status === "error" && "bg-red-500/10 text-red-500"
      )}
    >
      {status === "syncing" && (
        <>
          <Loader2 className="w-3 h-3 animate-spin" />
          <span>{t("common.saving")}</span>
        </>
      )}
      {status === "synced" && (
        <>
          <Cloud className="w-3 h-3" />
          <span>{t("common.success")}</span>
        </>
      )}
      {status === "error" && (
        <>
          <CloudOff className="w-3 h-3" />
          <span>{t("common.error")}</span>
        </>
      )}
    </div>
  );
}
