"use client";

import { useState, useEffect, useCallback } from "react";
import { Bitcoin, TrendingUp, TrendingDown, RefreshCw, Settings, Plus, X, Loader2, Bookmark, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useWidgetStore } from "@/stores/widget-store";
import { useLinksStore } from "@/stores/links-store";
import type { Widget } from "@/types/widget";
import { cn } from "@/lib/utils";
import { motion } from "motion/react";
import { toast } from "sonner";

interface CryptoWidgetProps {
  widget: Widget;
}

interface CryptoConfig {
  coins?: string[];
  currency?: string;
  refreshInterval?: number;
}

interface CoinData {
  id: string;
  symbol: string;
  name: string;
  current_price: number;
  price_change_percentage_24h: number;
  image: string;
  market_cap: number;
  market_cap_rank: number;
}

const POPULAR_COINS = [
  { id: "bitcoin", symbol: "BTC", name: "Bitcoin" },
  { id: "ethereum", symbol: "ETH", name: "Ethereum" },
  { id: "binancecoin", symbol: "BNB", name: "BNB" },
  { id: "solana", symbol: "SOL", name: "Solana" },
  { id: "ripple", symbol: "XRP", name: "XRP" },
  { id: "cardano", symbol: "ADA", name: "Cardano" },
  { id: "dogecoin", symbol: "DOGE", name: "Dogecoin" },
  { id: "polkadot", symbol: "DOT", name: "Polkadot" },
  { id: "avalanche-2", symbol: "AVAX", name: "Avalanche" },
  { id: "chainlink", symbol: "LINK", name: "Chainlink" },
];

const CURRENCIES = [
  { code: "usd", symbol: "$", name: "US Dollar" },
  { code: "eur", symbol: "€", name: "Euro" },
  { code: "gbp", symbol: "£", name: "British Pound" },
  { code: "jpy", symbol: "¥", name: "Japanese Yen" },
  { code: "mxn", symbol: "$", name: "Mexican Peso" },
];

function formatPrice(price: number, currency: string): string {
  const currencyInfo = CURRENCIES.find(c => c.code === currency) || CURRENCIES[0];

  if (price >= 1000) {
    return `${currencyInfo.symbol}${price.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  } else if (price >= 1) {
    return `${currencyInfo.symbol}${price.toFixed(2)}`;
  } else {
    return `${currencyInfo.symbol}${price.toFixed(6)}`;
  }
}

function formatMarketCap(marketCap: number): string {
  if (marketCap >= 1e12) {
    return `${(marketCap / 1e12).toFixed(2)}T`;
  } else if (marketCap >= 1e9) {
    return `${(marketCap / 1e9).toFixed(2)}B`;
  } else if (marketCap >= 1e6) {
    return `${(marketCap / 1e6).toFixed(2)}M`;
  }
  return marketCap.toLocaleString();
}

export function CryptoWidget({ widget }: CryptoWidgetProps) {
  const { updateWidget } = useWidgetStore();
  const { openAddLinkModal } = useLinksStore();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [coinData, setCoinData] = useState<CoinData[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSaveCoinAsLink = (coin: CoinData) => {
    const coinUrl = `https://www.coingecko.com/en/coins/${coin.id}`;
    openAddLinkModal({
      url: coinUrl,
      title: `${coin.name} (${coin.symbol.toUpperCase()})`,
      description: `Seguimiento de precio de ${coin.name} en CoinGecko`,
    });
    toast.success("Abriendo formulario para guardar enlace");
  };

  const config = widget.config as CryptoConfig | undefined;
  const coins = config?.coins || ["bitcoin", "ethereum"];
  const currency = config?.currency || "usd";
  const refreshInterval = config?.refreshInterval || 60;

  const [formData, setFormData] = useState<CryptoConfig>({
    coins: coins,
    currency: currency,
    refreshInterval: refreshInterval,
  });

  const fetchCryptoData = useCallback(async () => {
    if (coins.length === 0) {
      setCoinData([]);
      setIsLoading(false);
      return;
    }

    try {
      setError(null);
      const response = await fetch(
        `https://api.coingecko.com/api/v3/coins/markets?vs_currency=${currency}&ids=${coins.join(",")}&order=market_cap_desc&sparkline=false`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch crypto data");
      }

      const data = await response.json();
      setCoinData(data);
      setLastUpdated(new Date());
    } catch (err) {
      setError("Error al cargar datos");
      console.error("Crypto fetch error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [coins, currency]);

  useEffect(() => {
    fetchCryptoData();
    const interval = setInterval(fetchCryptoData, refreshInterval * 1000);
    return () => clearInterval(interval);
  }, [fetchCryptoData, refreshInterval]);

  const handleSave = () => {
    updateWidget(widget.id, {
      config: {
        ...widget.config,
        ...formData,
      },
    });
    setIsSettingsOpen(false);
    setIsLoading(true);
  };

  const addCoin = (coinId: string) => {
    if (!formData.coins?.includes(coinId)) {
      setFormData({
        ...formData,
        coins: [...(formData.coins || []), coinId],
      });
    }
  };

  const removeCoin = (coinId: string) => {
    setFormData({
      ...formData,
      coins: (formData.coins || []).filter(c => c !== coinId),
    });
  };

  // Empty state
  if (coins.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-6 text-center px-4">
        <div className="w-12 h-12 rounded-full bg-orange-500/20 flex items-center justify-center mb-3">
          <Bitcoin className="w-6 h-6 text-orange-500" />
        </div>
        <p className="text-sm text-muted-foreground mb-1">No hay criptomonedas</p>
        <p className="text-xs text-muted-foreground/60 mb-4">
          Agrega criptomonedas para seguir sus precios
        </p>
        <Button size="sm" onClick={() => setIsSettingsOpen(true)}>
          <Settings className="w-4 h-4 mr-2" />
          Configurar
        </Button>
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col">
      {/* Header with refresh */}
      <div className="flex items-center justify-between mb-2 px-1">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {lastUpdated ? `Actualizado ${lastUpdated.toLocaleTimeString()}` : "Cargando..."}
          </span>
        </div>
        <div className="flex gap-1">
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6"
            onClick={fetchCryptoData}
            disabled={isLoading}
          >
            <RefreshCw className={cn("w-3.5 h-3.5", isLoading && "animate-spin")} />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6"
            onClick={() => setIsSettingsOpen(true)}
          >
            <Settings className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Coin list */}
      <div className="flex-1 space-y-1 overflow-auto">
        {isLoading && coinData.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <p className="text-sm text-destructive">{error}</p>
            <Button size="sm" variant="outline" className="mt-2" onClick={fetchCryptoData}>
              Reintentar
            </Button>
          </div>
        ) : (
          coinData.map((coin) => (
            <motion.div
              key={coin.id}
              className="flex items-center gap-2 p-2 rounded-lg hover:bg-secondary/50 transition-colors group"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <img
                src={coin.image}
                alt={coin.name}
                className="w-6 h-6 rounded-full"
                loading="lazy"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <span className="font-medium text-sm truncate">{coin.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {coin.symbol.toUpperCase()}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground">
                  #{coin.market_cap_rank} • {formatMarketCap(coin.market_cap)}
                </div>
              </div>
              <div className="text-right">
                <div className="font-medium text-sm">
                  {formatPrice(coin.current_price, currency)}
                </div>
                <div className={cn(
                  "flex items-center gap-0.5 text-xs",
                  coin.price_change_percentage_24h >= 0 ? "text-green-500" : "text-red-500"
                )}>
                  {coin.price_change_percentage_24h >= 0 ? (
                    <TrendingUp className="w-3 h-3" />
                  ) : (
                    <TrendingDown className="w-3 h-3" />
                  )}
                  {Math.abs(coin.price_change_percentage_24h).toFixed(2)}%
                </div>
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6"
                  onClick={() => handleSaveCoinAsLink(coin)}
                  title="Guardar como enlace"
                >
                  <Bookmark className="w-3 h-3" />
                </Button>
                <a
                  href={`https://www.coingecko.com/en/coins/${coin.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center h-6 w-6 rounded-md hover:bg-secondary"
                  title="Ver en CoinGecko"
                >
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Settings Dialog */}
      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent className="sm:max-w-md glass">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bitcoin className="w-5 h-5 text-orange-500" />
              Configurar Crypto
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Moneda base</Label>
              <Select
                value={formData.currency}
                onValueChange={(value) => setFormData({ ...formData, currency: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona moneda" />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((curr) => (
                    <SelectItem key={curr.code} value={curr.code}>
                      {curr.symbol} {curr.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Intervalo de actualizacion (segundos)</Label>
              <Input
                type="number"
                min="30"
                max="300"
                value={formData.refreshInterval}
                onChange={(e) => setFormData({ ...formData, refreshInterval: parseInt(e.target.value) || 60 })}
              />
            </div>

            <div className="space-y-2">
              <Label>Criptomonedas seleccionadas</Label>
              <div className="flex flex-wrap gap-1">
                {formData.coins?.map((coinId) => {
                  const coin = POPULAR_COINS.find(c => c.id === coinId);
                  return (
                    <Badge key={coinId} variant="secondary" className="gap-1">
                      {coin?.symbol || coinId}
                      <button onClick={() => removeCoin(coinId)}>
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Agregar criptomoneda</Label>
              <div className="flex flex-wrap gap-1">
                {POPULAR_COINS.filter(c => !formData.coins?.includes(c.id)).map((coin) => (
                  <Button
                    key={coin.id}
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    onClick={() => addCoin(coin.id)}
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    {coin.symbol}
                  </Button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsSettingsOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
