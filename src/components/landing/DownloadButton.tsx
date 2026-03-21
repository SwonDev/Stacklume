"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";

const GITHUB_API =
  "https://api.github.com/repos/SwonDev/Stacklume/releases/latest";

export function DownloadButton() {
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [version, setVersion] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(GITHUB_API, {
      headers: { Accept: "application/vnd.github.v3+json" },
    })
      .then((res) => res.json())
      .then((release) => {
        const ver = (release.tag_name || "").replace(/^v/, "");
        setVersion(ver);
        const asset = (release.assets || []).find(
          (a: { name: string }) => a.name.endsWith("_x64-setup.exe"),
        );
        if (asset) {
          setDownloadUrl(asset.browser_download_url);
        } else {
          setDownloadUrl(
            `https://github.com/SwonDev/Stacklume/releases/download/v${ver}/Stacklume_${ver}_x64-setup.exe`,
          );
        }
      })
      .catch(() => {
        setDownloadUrl(
          "https://github.com/SwonDev/Stacklume/releases/latest",
        );
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <Button
      size="lg"
      className="gap-2 px-6 text-base font-semibold"
      style={{
        background:
          "linear-gradient(135deg, oklch(0.75 0.14 85), oklch(0.65 0.15 85))",
        color: "oklch(0.12 0.03 250)",
      }}
      asChild
      disabled={loading}
    >
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
