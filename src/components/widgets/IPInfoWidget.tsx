"use client";

import { useState, useEffect } from "react";
import { Copy, RefreshCw, MapPin, Server, Clock, Network } from "lucide-react";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import type { Widget } from "@/types/widget";
import { toast } from "sonner";

interface IPInfoWidgetProps {
  widget: Widget;
}

interface IPData {
  ip: string;
  city: string;
  region: string;
  country: string;
  country_name: string;
  org: string;
  timezone: string;
  postal?: string;
  latitude?: number;
  longitude?: number;
}

const fetchIPInfo = async (): Promise<IPData | null> => {
  try {
    // Using ipapi.co which provides free IP geolocation
    const response = await fetch("https://ipapi.co/json/");

    if (!response.ok) {
      throw new Error("Failed to fetch IP info");
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("IP info fetch error:", error);
    return null;
  }
};

export function IPInfoWidget({ widget: _widget }: IPInfoWidgetProps) {
  const [ipData, setIpData] = useState<IPData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const loadIPInfo = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await fetchIPInfo();

      if (data) {
        setIpData(data);
        setLastUpdated(new Date());
      } else {
        setError("No se pudo obtener la información");
      }
    } catch (err) {
      setError("Error al cargar datos");
      console.error("Error loading IP info:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadIPInfo();
  }, []);

  const handleCopyIP = () => {
    if (ipData?.ip) {
      navigator.clipboard.writeText(ipData.ip);
      toast.success("IP copiada al portapapeles");
    }
  };

  const handleRefresh = () => {
    loadIPInfo();
  };

  // Loading state
  if (isLoading && !ipData) {
    return (
      <div className="@container h-full w-full p-3 @sm:p-4">
        <div className="flex flex-col h-full gap-3">
          <div className="flex items-center justify-between">
            <div className="h-4 w-24 bg-muted animate-pulse rounded" />
            <div className="h-6 w-6 bg-muted animate-pulse rounded" />
          </div>
          <div className="h-8 w-full bg-muted animate-pulse rounded" />
          <div className="space-y-2">
            <div className="h-4 w-full bg-muted animate-pulse rounded" />
            <div className="h-4 w-3/4 bg-muted animate-pulse rounded" />
            <div className="h-4 w-5/6 bg-muted animate-pulse rounded" />
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !ipData) {
    return (
      <div className="@container h-full w-full">
        <div className="flex flex-col items-center justify-center h-full p-4 gap-4">
          <div className="w-12 h-12 rounded-full bg-destructive/20 flex items-center justify-center">
            <Network className="w-6 h-6 text-destructive" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-foreground mb-1">Error al cargar</p>
            <p className="text-xs text-muted-foreground mb-4">{error}</p>
            <Button size="sm" onClick={handleRefresh} variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              Reintentar
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!ipData) return null;

  return (
    <div className="@container h-full w-full">
      <div className="flex flex-col h-full p-3 @sm:p-4 gap-3 @sm:gap-4">
        {/* Header with refresh button */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 @sm:w-10 @sm:h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Network className="w-4 h-4 @sm:w-5 @sm:h-5 text-primary" />
            </div>
            <div className="hidden @sm:block">
              <h3 className="text-sm font-medium text-foreground">Tu IP</h3>
              <p className="text-xs text-muted-foreground">
                {lastUpdated ? lastUpdated.toLocaleTimeString() : ""}
              </p>
            </div>
          </div>

          <Button
            onClick={handleRefresh}
            variant="ghost"
            size="sm"
            className="h-7 w-7 @sm:h-8 @sm:w-8 p-0"
            disabled={isLoading}
          >
            <RefreshCw className={`w-3.5 h-3.5 @sm:w-4 @sm:h-4 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
        </div>

        {/* IP Address - Main Display */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between p-3 @sm:p-4 rounded-lg bg-secondary/50 border border-border/50"
        >
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground mb-1">Dirección IP</p>
            <p className="text-lg @sm:text-xl @md:text-2xl font-mono font-bold text-foreground truncate">
              {ipData.ip}
            </p>
          </div>
          <Button
            onClick={handleCopyIP}
            variant="ghost"
            size="sm"
            className="h-8 w-8 @sm:h-9 @sm:w-9 p-0 shrink-0 ml-2"
          >
            <Copy className="w-4 h-4" />
          </Button>
        </motion.div>

        {/* Location Information */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex-1 space-y-2 @sm:space-y-3 overflow-auto"
        >
          {/* City, Region, Country */}
          <div className="flex items-start gap-2 @sm:gap-3">
            <div className="w-8 h-8 @sm:w-9 @sm:h-9 rounded-lg bg-background/50 flex items-center justify-center shrink-0">
              <MapPin className="w-4 h-4 text-blue-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground">Ubicación</p>
              <p className="text-sm @sm:text-base font-medium text-foreground truncate">
                {ipData.city}
                {ipData.region && `, ${ipData.region}`}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {ipData.country_name || ipData.country}
              </p>
            </div>
          </div>

          {/* ISP/Organization */}
          <div className="flex items-start gap-2 @sm:gap-3">
            <div className="w-8 h-8 @sm:w-9 @sm:h-9 rounded-lg bg-background/50 flex items-center justify-center shrink-0">
              <Server className="w-4 h-4 text-purple-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground">ISP/Organización</p>
              <p className="text-sm @sm:text-base font-medium text-foreground break-words">
                {ipData.org || "No disponible"}
              </p>
            </div>
          </div>

          {/* Timezone - visible on medium+ containers */}
          <div className="hidden @md:flex items-start gap-2 @sm:gap-3">
            <div className="w-8 h-8 @sm:w-9 @sm:h-9 rounded-lg bg-background/50 flex items-center justify-center shrink-0">
              <Clock className="w-4 h-4 text-green-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground">Zona Horaria</p>
              <p className="text-sm @sm:text-base font-medium text-foreground truncate">
                {ipData.timezone || "No disponible"}
              </p>
            </div>
          </div>

          {/* Compact info for small containers */}
          <div className="flex @md:hidden items-center gap-1 pt-1">
            <Clock className="w-3 h-3 text-green-500" />
            <span className="text-xs text-muted-foreground truncate">
              {ipData.timezone || "No disponible"}
            </span>
          </div>
        </motion.div>

        {/* Last Updated Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="hidden @sm:flex items-center justify-center pt-2 border-t border-border/50"
        >
          <p className="text-xs text-muted-foreground">
            Actualizado {lastUpdated ? lastUpdated.toLocaleTimeString() : ""}
          </p>
        </motion.div>
      </div>
    </div>
  );
}
