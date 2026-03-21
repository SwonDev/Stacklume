"use client";

import { useEffect, useState } from "react";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import { Download, Loader2 } from "lucide-react";

const GITHUB_API =
  "https://api.github.com/repos/SwonDev/Stacklume/releases/latest";

interface DownloadButtonProps {
  className?: string;
  size?: "default" | "large";
}

export function DownloadButton({
  className,
  size = "default",
}: DownloadButtonProps) {
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

  const isLarge = size === "large";

  return (
    <a
      href={downloadUrl || "#"}
      download={downloadUrl ? true : undefined}
      className={className}
    >
      <ShimmerButton
        shimmerColor="#e6c77a"
        shimmerSize="0.06em"
        background="linear-gradient(135deg, #b8923f 0%, #d4a853 50%, #b8923f 100%)"
        borderRadius="12px"
        className={`gap-2.5 font-semibold ${isLarge ? "px-8 py-4 text-lg" : "px-6 py-3 text-sm"}`}
        disabled={loading}
      >
        {loading ? (
          <Loader2 className={`animate-spin ${isLarge ? "size-5" : "size-4"}`} />
        ) : (
          <Download className={isLarge ? "size-5" : "size-4"} />
        )}
        <span style={{ color: "#0a1628" }}>
          Descargar{version ? ` v${version}` : ""} para Windows
        </span>
      </ShimmerButton>
    </a>
  );
}

export function useLatestVersion() {
  const [version, setVersion] = useState("");

  useEffect(() => {
    fetch(GITHUB_API, {
      headers: { Accept: "application/vnd.github.v3+json" },
    })
      .then((res) => res.json())
      .then((release) => {
        setVersion((release.tag_name || "").replace(/^v/, ""));
      })
      .catch(() => {});
  }, []);

  return version;
}
