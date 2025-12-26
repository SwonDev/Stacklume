"use client";

import { useState, useCallback } from "react";
import { Twitter, ExternalLink, RefreshCw, Settings, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useWidgetStore } from "@/stores/widget-store";
import type { Widget } from "@/types/widget";

interface TwitterFeedWidgetProps {
  widget: Widget;
}

interface TwitterConfig {
  twitterUsername?: string;
  embedTheme?: "light" | "dark";
}

export function TwitterFeedWidget({ widget }: TwitterFeedWidgetProps) {
  const config = (widget.config as unknown as TwitterConfig) || {};
  const username = config.twitterUsername || "";
  const embedTheme = config.embedTheme || "dark";

  const [isConfiguring, setIsConfiguring] = useState(false);
  const [inputUsername, setInputUsername] = useState(username);
  const [embedKey, setEmbedKey] = useState(0);

  // Save username to widget config
  const handleSave = useCallback(() => {
    const cleanUsername = inputUsername.trim().replace(/^@/, "");
    if (cleanUsername) {
      const updatedConfig: TwitterConfig = {
        ...config,
        twitterUsername: cleanUsername,
      };
      useWidgetStore.getState().updateWidget(widget.id, { config: updatedConfig as Record<string, unknown> });
      setIsConfiguring(false);
      setEmbedKey((prev) => prev + 1);
    }
  }, [inputUsername, config, widget.id]);

  // Remove username
  const handleRemove = useCallback(() => {
    const updatedConfig: TwitterConfig = {
      ...config,
      twitterUsername: undefined,
    };
    useWidgetStore.getState().updateWidget(widget.id, { config: updatedConfig as Record<string, unknown> });
    setInputUsername("");
  }, [config, widget.id]);

  // Refresh embed
  const handleRefresh = useCallback(() => {
    setEmbedKey((prev) => prev + 1);
  }, []);

  // Toggle theme
  const toggleTheme = useCallback(() => {
    const newTheme = embedTheme === "dark" ? "light" : "dark";
    const updatedConfig: TwitterConfig = {
      ...config,
      embedTheme: newTheme,
    };
    useWidgetStore.getState().updateWidget(widget.id, { config: updatedConfig as Record<string, unknown> });
    setEmbedKey((prev) => prev + 1);
  }, [config, embedTheme, widget.id]);

  return (
    <div className="flex h-full flex-col @container">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1DA1F2]/10">
            <Twitter className="h-4 w-4 text-[#1DA1F2]" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">Twitter / X</h3>
            {username && (
              <p className="text-xs text-muted-foreground">@{username}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          {username && (
            <>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleRefresh}
                className="h-8 w-8"
                title="Recargar"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
              <a
                href={`https://twitter.com/${username}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-accent"
                title="Ver en Twitter"
              >
                <ExternalLink className="h-4 w-4 text-muted-foreground" />
              </a>
            </>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsConfiguring(!isConfiguring)}
            className="h-8 w-8"
          >
            {isConfiguring ? (
              <X className="h-4 w-4" />
            ) : (
              <Settings className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Configuration Form */}
      {isConfiguring && (
        <div className="border-b p-4">
          <div className="flex gap-2">
            <Input
              placeholder="Usuario de Twitter (ej: elonmusk)"
              value={inputUsername}
              onChange={(e) => setInputUsername(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
              className="flex-1"
            />
            <Button onClick={handleSave} size="sm">
              Guardar
            </Button>
          </div>
          {username && (
            <div className="mt-3 flex items-center justify-between">
              <Button variant="outline" size="sm" onClick={toggleTheme}>
                Tema: {embedTheme === "dark" ? "Oscuro" : "Claro"}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRemove}
                className="text-destructive hover:text-destructive"
              >
                Eliminar usuario
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {!username ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#1DA1F2]/10">
              <Twitter className="h-8 w-8 text-[#1DA1F2]" />
            </div>
            <div>
              <h4 className="font-medium">Sin usuario configurado</h4>
              <p className="mt-1 text-sm text-muted-foreground">
                Configura un usuario de Twitter para ver su timeline
              </p>
            </div>
            <Button onClick={() => setIsConfiguring(true)} size="sm">
              <Settings className="mr-2 h-4 w-4" />
              Configurar
            </Button>
          </div>
        ) : (
          <div className="h-full w-full overflow-auto" key={embedKey}>
            {/* Twitter Timeline Embed using iframe */}
            <iframe
              src={`https://syndication.twitter.com/srv/timeline-profile/screen-name/${username}?dnt=true&embedId=twitter-widget&frame=false&hideBorder=true&hideFooter=true&hideHeader=true&hideScrollBar=false&origin=https://localhost&theme=${embedTheme}&transparent=true`}
              className="h-full w-full border-0"
              title={`Twitter timeline de @${username}`}
              sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
              style={{
                colorScheme: embedTheme,
                minHeight: "400px",
              }}
            />
          </div>
        )}
      </div>

      {/* Fallback link */}
      {username && (
        <div className="border-t px-4 py-2 text-center">
          <a
            href={`https://twitter.com/${username}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary"
          >
            <ExternalLink className="h-3 w-3" />
            Ver perfil completo en Twitter
          </a>
        </div>
      )}
    </div>
  );
}
