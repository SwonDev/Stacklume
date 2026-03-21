"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";

const GITHUB_API = "https://api.github.com/repos/SwonDev/Stacklume/releases/latest";

export function DownloadButton() {
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [version, setVersion] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(GITHUB_API, { headers: { Accept: "application/vnd.github.v3+json" } })
      .then((res) => res.json())
      .then((release) => {
        const ver = (release.tag_name || "").replace(/^v/, "");
        setVersion(ver);
        // Find the .exe installer asset
        const asset = (release.assets || []).find(
          (a: { name: string }) => a.name.endsWith("_x64-setup.exe")
        );
        if (asset) {
          setDownloadUrl(asset.browser_download_url);
        } else {
          // Fallback: construct URL from version
          setDownloadUrl(
            `https://github.com/SwonDev/Stacklume/releases/download/v${ver}/Stacklume_${ver}_x64-setup.exe`
          );
        }
      })
      .catch(() => {
        // Fallback to releases page
        setDownloadUrl("https://github.com/SwonDev/Stacklume/releases/latest");
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <Button size="lg" className="gap-2 px-6 text-base" asChild disabled={loading}>
      <a href={downloadUrl || "#"} download={downloadUrl ? true : undefined}>
        {loading ? (
          <Loader2 className="size-5 animate-spin" />
        ) : (
          <Download className="size-5" />
        )}
        Descargar{version ? ` v${version}` : ""} para Windows
      </a>
    </Button>
  );
}
