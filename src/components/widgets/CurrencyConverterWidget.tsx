"use client";

import { useState, useEffect } from "react";
import { Coins, ArrowRightLeft, Star } from "lucide-react";
import { motion } from "motion/react";
import type { Widget } from "@/types/widget";
import { useWidgetStore } from "@/stores/widget-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface CurrencyConverterWidgetProps {
  widget: Widget;
}

// Currency data with exchange rates relative to USD and flag emojis
const CURRENCIES = [
  { code: "USD", name: "US Dollar", flag: "🇺🇸", rate: 1.0 },
  { code: "EUR", name: "Euro", flag: "🇪🇺", rate: 0.92 },
  { code: "GBP", name: "British Pound", flag: "🇬🇧", rate: 0.79 },
  { code: "JPY", name: "Japanese Yen", flag: "🇯🇵", rate: 149.5 },
  { code: "CAD", name: "Canadian Dollar", flag: "🇨🇦", rate: 1.36 },
  { code: "AUD", name: "Australian Dollar", flag: "🇦🇺", rate: 1.53 },
  { code: "CHF", name: "Swiss Franc", flag: "🇨🇭", rate: 0.88 },
  { code: "CNY", name: "Chinese Yuan", flag: "🇨🇳", rate: 7.24 },
  { code: "INR", name: "Indian Rupee", flag: "🇮🇳", rate: 83.12 },
  { code: "MXN", name: "Mexican Peso", flag: "🇲🇽", rate: 17.05 },
  { code: "BRL", name: "Brazilian Real", flag: "🇧🇷", rate: 4.97 },
  { code: "KRW", name: "South Korean Won", flag: "🇰🇷", rate: 1308.5 },
  { code: "RUB", name: "Russian Ruble", flag: "🇷🇺", rate: 91.5 },
  { code: "ZAR", name: "South African Rand", flag: "🇿🇦", rate: 18.65 },
  { code: "SEK", name: "Swedish Krona", flag: "🇸🇪", rate: 10.35 },
  { code: "NZD", name: "New Zealand Dollar", flag: "🇳🇿", rate: 1.63 },
  { code: "SGD", name: "Singapore Dollar", flag: "🇸🇬", rate: 1.34 },
  { code: "HKD", name: "Hong Kong Dollar", flag: "🇭🇰", rate: 7.78 },
  { code: "NOK", name: "Norwegian Krone", flag: "🇳🇴", rate: 10.88 },
  { code: "TRY", name: "Turkish Lira", flag: "🇹🇷", rate: 32.15 },
] as const;

type CurrencyCode = (typeof CURRENCIES)[number]["code"];

interface FavoritePair {
  from: string;
  to: string;
}

export function CurrencyConverterWidget({ widget }: CurrencyConverterWidgetProps) {
  // Note: Use getState() for updateWidget to prevent re-render loops

  // Initialize state from widget config
  const [amount, setAmount] = useState<string>(
    widget.config?.lastAmount?.toString() || "100"
  );
  const [fromCurrency, setFromCurrency] = useState<CurrencyCode>(
    (widget.config?.baseCurrency as CurrencyCode) || "USD"
  );
  const [toCurrency, setToCurrency] = useState<CurrencyCode>(
    (widget.config?.targetCurrency as CurrencyCode) || "EUR"
  );
  const [favoritePairs, setFavoritePairs] = useState<FavoritePair[]>(
    (widget.config?.favoritePairs as FavoritePair[]) || []
  );

  // Convert currency
  const convertCurrency = (value: number, from: CurrencyCode, to: CurrencyCode): number => {
    const fromRate = CURRENCIES.find((c) => c.code === from)?.rate || 1;
    const toRate = CURRENCIES.find((c) => c.code === to)?.rate || 1;
    // Convert to USD first, then to target currency
    const usdAmount = value / fromRate;
    return usdAmount * toRate;
  };

  // Calculate converted amount
  const numericAmount = parseFloat(amount) || 0;
  const convertedAmount = convertCurrency(numericAmount, fromCurrency, toCurrency);

  // Calculate exchange rate
  const exchangeRate = convertCurrency(1, fromCurrency, toCurrency);

  // Swap currencies
  const handleSwap = () => {
    setFromCurrency(toCurrency);
    setToCurrency(fromCurrency);
  };

  // Toggle favorite pair
  const toggleFavorite = () => {
    const pairExists = favoritePairs.some(
      (pair) => pair.from === fromCurrency && pair.to === toCurrency
    );

    let newFavorites: FavoritePair[];
    if (pairExists) {
      newFavorites = favoritePairs.filter(
        (pair) => !(pair.from === fromCurrency && pair.to === toCurrency)
      );
    } else {
      // Limit to 3 favorite pairs
      if (favoritePairs.length >= 3) {
        newFavorites = [...favoritePairs.slice(1), { from: fromCurrency, to: toCurrency }];
      } else {
        newFavorites = [...favoritePairs, { from: fromCurrency, to: toCurrency }];
      }
    }

    setFavoritePairs(newFavorites);
  };

  const isFavorite = favoritePairs.some(
    (pair) => pair.from === fromCurrency && pair.to === toCurrency
  );

  // Load favorite pair
  const loadFavoritePair = (pair: FavoritePair) => {
    setFromCurrency(pair.from as CurrencyCode);
    setToCurrency(pair.to as CurrencyCode);
  };

  // Save configuration to widget config
  useEffect(() => {
    const saveConfig = setTimeout(() => {
      useWidgetStore.getState().updateWidget(widget.id, {
        config: {
          ...widget.config,
          baseCurrency: fromCurrency,
          targetCurrency: toCurrency,
          lastAmount: numericAmount,
          favoritePairs,
        },
      });
    }, 500);

    return () => clearTimeout(saveConfig);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromCurrency, toCurrency, numericAmount, favoritePairs, widget.id]);

  // Get currency flag
  const getCurrencyFlag = (code: string) => {
    return CURRENCIES.find((c) => c.code === code)?.flag || "💱";
  };

  // Format number with appropriate decimals
  const formatAmount = (value: number): string => {
    if (value >= 100) {
      return value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    return value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 4 });
  };

  return (
    <div className="@container h-full w-full">
      <div className="flex flex-col h-full p-3 @sm:p-4 @md:p-5 gap-3 @sm:gap-4">
        {/* Header with icon */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 @sm:w-9 @sm:h-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <Coins className="w-4 h-4 @sm:w-5 @sm:h-5 text-primary" />
            </div>
            <h3 className="text-sm @sm:text-base font-semibold hidden @xs:block">Currency</h3>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={toggleFavorite}
            aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
          >
            <Star
              className={`w-4 h-4 ${
                isFavorite ? "fill-yellow-500 text-yellow-500" : "text-muted-foreground"
              }`}
            />
          </Button>
        </motion.div>

        {/* Amount Input */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-1.5"
        >
          <Label htmlFor={`amount-${widget.id}`} className="text-xs @sm:text-sm">
            Amount
          </Label>
          <Input
            id={`amount-${widget.id}`}
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Enter amount"
            className="h-9 @sm:h-10 text-sm @sm:text-base"
          />
        </motion.div>

        {/* From Currency */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-1.5"
        >
          <Label htmlFor={`from-${widget.id}`} className="text-xs @sm:text-sm">
            From
          </Label>
          <Select value={fromCurrency} onValueChange={(val) => setFromCurrency(val as CurrencyCode)}>
            <SelectTrigger id={`from-${widget.id}`} className="h-9 @sm:h-10 text-sm @sm:text-base">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CURRENCIES.map((currency) => (
                <SelectItem key={currency.code} value={currency.code}>
                  <span className="flex items-center gap-2">
                    <span>{currency.flag}</span>
                    <span className="font-medium">{currency.code}</span>
                    <span className="text-muted-foreground text-xs hidden @sm:inline">
                      - {currency.name}
                    </span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </motion.div>

        {/* Swap Button */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="flex justify-center"
        >
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9 @sm:h-10 @sm:w-10 rounded-full"
            onClick={handleSwap}
            aria-label="Swap currencies"
          >
            <ArrowRightLeft className="w-4 h-4" />
          </Button>
        </motion.div>

        {/* To Currency */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="space-y-1.5"
        >
          <Label htmlFor={`to-${widget.id}`} className="text-xs @sm:text-sm">
            To
          </Label>
          <Select value={toCurrency} onValueChange={(val) => setToCurrency(val as CurrencyCode)}>
            <SelectTrigger id={`to-${widget.id}`} className="h-9 @sm:h-10 text-sm @sm:text-base">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CURRENCIES.map((currency) => (
                <SelectItem key={currency.code} value={currency.code}>
                  <span className="flex items-center gap-2">
                    <span>{currency.flag}</span>
                    <span className="font-medium">{currency.code}</span>
                    <span className="text-muted-foreground text-xs hidden @sm:inline">
                      - {currency.name}
                    </span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </motion.div>

        {/* Converted Amount Display */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-auto pt-3 @sm:pt-4 border-t"
        >
          <div className="text-center space-y-1.5 @sm:space-y-2">
            <div className="flex items-center justify-center gap-2 text-2xl @sm:text-3xl @md:text-4xl font-bold">
              <span>{getCurrencyFlag(toCurrency)}</span>
              <motion.span
                key={`${convertedAmount}-${toCurrency}`}
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="tabular-nums"
              >
                {formatAmount(convertedAmount)}
              </motion.span>
            </div>
            <div className="text-xs @sm:text-sm text-muted-foreground">
              1 {fromCurrency} = {formatAmount(exchangeRate)} {toCurrency}
            </div>
          </div>
        </motion.div>

        {/* Favorite Pairs */}
        {favoritePairs.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="flex flex-wrap gap-1.5 @sm:gap-2 pt-2 border-t"
          >
            {favoritePairs.map((pair, index) => (
              <Button
                key={`${pair.from}-${pair.to}-${index}`}
                variant="secondary"
                size="sm"
                className="h-7 @sm:h-8 text-xs px-2 @sm:px-3"
                onClick={() => loadFavoritePair(pair)}
              >
                {getCurrencyFlag(pair.from)} {pair.from} → {getCurrencyFlag(pair.to)} {pair.to}
              </Button>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
}
