"use client";

import { useState, useCallback } from "react";
import type { Widget } from "@/types/widget";
import { useWidgetStore } from "@/stores/widget-store";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { motion, AnimatePresence } from "motion/react";
import { Dices, Plus, Minus, History, RotateCcw } from "lucide-react";

interface DiceRollerWidgetProps {
  widget: Widget;
}

interface RollResult {
  id: string;
  diceType: number;
  diceCount: number;
  modifier: number;
  results: number[];
  total: number;
  timestamp: number;
}

const DICE_TYPES = [4, 6, 8, 10, 12, 20, 100];
const DICE_COUNTS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

export function DiceRollerWidget({ widget: _widget }: DiceRollerWidgetProps) {
  const { updateWidget: _updateWidget } = useWidgetStore();

  const [diceType, setDiceType] = useState<number>(20);
  const [diceCount, setDiceCount] = useState<number>(1);
  const [modifier, setModifier] = useState<number>(0);
  const [isRolling, setIsRolling] = useState(false);
  const [currentRoll, setCurrentRoll] = useState<RollResult | null>(null);
  const [history, setHistory] = useState<RollResult[]>([]);

  const rollDice = useCallback((sides: number): number => {
    return Math.floor(Math.random() * sides) + 1;
  }, []);

  const handleRoll = useCallback(() => {
    setIsRolling(true);

    // Animate rolling
    setTimeout(() => {
      const results: number[] = [];
      for (let i = 0; i < diceCount; i++) {
        results.push(rollDice(diceType));
      }

      const total = results.reduce((sum, val) => sum + val, 0) + modifier;

      const newRoll: RollResult = {
        id: Date.now().toString(),
        diceType,
        diceCount,
        modifier,
        results,
        total,
        timestamp: Date.now(),
      };

      setCurrentRoll(newRoll);
      setHistory((prev) => [newRoll, ...prev].slice(0, 10));
      setIsRolling(false);
    }, 600);
  }, [diceType, diceCount, modifier, rollDice]);

  const incrementModifier = useCallback(() => {
    setModifier((prev) => Math.min(prev + 1, 99));
  }, []);

  const decrementModifier = useCallback(() => {
    setModifier((prev) => Math.max(prev - 1, -99));
  }, []);

  const resetModifier = useCallback(() => {
    setModifier(0);
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
    setCurrentRoll(null);
  }, []);

  const getDiceColor = (type: number): string => {
    const colors: Record<number, string> = {
      4: "from-purple-500 to-purple-600",
      6: "from-blue-500 to-blue-600",
      8: "from-green-500 to-green-600",
      10: "from-yellow-500 to-yellow-600",
      12: "from-orange-500 to-orange-600",
      20: "from-red-500 to-red-600",
      100: "from-pink-500 to-pink-600",
    };
    return colors[type] || "from-gray-500 to-gray-600";
  };

  return (
    <div className="h-full w-full @container flex flex-col gap-3 @xs:gap-4 p-3 @xs:p-4 bg-gradient-to-br from-zinc-900 to-zinc-950 rounded-lg">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Dices className="w-4 h-4 @xs:w-5 @xs:h-5 text-purple-400" />
          <h3 className="font-semibold text-sm @xs:text-base text-zinc-100">Dice Roller</h3>
        </div>
        {history.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearHistory}
            className="h-7 @xs:h-8 px-2 text-xs hover:bg-zinc-800"
          >
            <RotateCcw className="w-3 h-3 @xs:w-4 @xs:h-4" />
          </Button>
        )}
      </div>

      {/* Controls */}
      <div className="grid grid-cols-2 gap-2 @xs:gap-3">
        {/* Dice Type */}
        <div className="space-y-1.5">
          <label className="text-xs text-zinc-400">Dice Type</label>
          <Select
            value={diceType.toString()}
            onValueChange={(value) => setDiceType(Number(value))}
          >
            <SelectTrigger className="h-8 @xs:h-9 text-xs @xs:text-sm bg-zinc-800 border-zinc-700">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DICE_TYPES.map((type) => (
                <SelectItem key={type} value={type.toString()}>
                  d{type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Dice Count */}
        <div className="space-y-1.5">
          <label className="text-xs text-zinc-400">Count</label>
          <Select
            value={diceCount.toString()}
            onValueChange={(value) => setDiceCount(Number(value))}
          >
            <SelectTrigger className="h-8 @xs:h-9 text-xs @xs:text-sm bg-zinc-800 border-zinc-700">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DICE_COUNTS.map((count) => (
                <SelectItem key={count} value={count.toString()}>
                  {count}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Modifier */}
      <div className="space-y-1.5">
        <label className="text-xs text-zinc-400">Modifier</label>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={decrementModifier}
            className="h-8 @xs:h-9 px-2 @xs:px-3 bg-zinc-800 border-zinc-700 hover:bg-zinc-700"
          >
            <Minus className="w-3 h-3 @xs:w-4 @xs:h-4" />
          </Button>
          <div className="flex-1 flex items-center justify-center h-8 @xs:h-9 bg-zinc-800 rounded-md border border-zinc-700">
            <span className="text-sm @xs:text-base font-semibold text-zinc-100">
              {modifier >= 0 ? '+' : ''}{modifier}
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={incrementModifier}
            className="h-8 @xs:h-9 px-2 @xs:px-3 bg-zinc-800 border-zinc-700 hover:bg-zinc-700"
          >
            <Plus className="w-3 h-3 @xs:w-4 @xs:h-4" />
          </Button>
          {modifier !== 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={resetModifier}
              className="h-8 @xs:h-9 px-2 text-xs hover:bg-zinc-800"
            >
              <RotateCcw className="w-3 h-3 @xs:w-4 @xs:h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Roll Button */}
      <Button
        onClick={handleRoll}
        disabled={isRolling}
        className={`h-12 @xs:h-14 text-sm @xs:text-base font-bold bg-gradient-to-r ${getDiceColor(diceType)} hover:opacity-90 transition-opacity`}
      >
        <motion.div
          animate={isRolling ? { rotate: 360 } : { rotate: 0 }}
          transition={{ duration: 0.6, ease: "easeInOut" }}
          className="mr-2"
        >
          <Dices className="w-5 h-5 @xs:w-6 @xs:h-6" />
        </motion.div>
        {isRolling ? "Rolling..." : "Roll Dice"}
      </Button>

      {/* Current Result */}
      <AnimatePresence mode="wait">
        {currentRoll && (
          <motion.div
            key={currentRoll.id}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            className="space-y-2 @xs:space-y-3 p-3 @xs:p-4 bg-zinc-800/50 rounded-lg border border-zinc-700"
          >
            {/* Individual Results */}
            <div className="flex flex-wrap gap-1.5 @xs:gap-2">
              {currentRoll.results.map((result, index) => (
                <motion.div
                  key={index}
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`flex items-center justify-center w-8 h-8 @xs:w-10 @xs:h-10 rounded-md bg-gradient-to-br ${getDiceColor(currentRoll.diceType)} font-bold text-white text-xs @xs:text-sm shadow-lg`}
                >
                  {result}
                </motion.div>
              ))}
              {currentRoll.modifier !== 0 && (
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ delay: currentRoll.results.length * 0.05 }}
                  className="flex items-center justify-center w-8 h-8 @xs:w-10 @xs:h-10 rounded-md bg-zinc-700 font-bold text-white text-xs @xs:text-sm"
                >
                  {currentRoll.modifier >= 0 ? '+' : ''}{currentRoll.modifier}
                </motion.div>
              )}
            </div>

            {/* Total */}
            <div className="flex items-center justify-between pt-2 border-t border-zinc-700">
              <span className="text-xs @xs:text-sm text-zinc-400">
                {currentRoll.diceCount}d{currentRoll.diceType}
                {currentRoll.modifier !== 0 && ` ${currentRoll.modifier >= 0 ? '+' : ''}${currentRoll.modifier}`}
              </span>
              <motion.span
                initial={{ scale: 1.5 }}
                animate={{ scale: 1 }}
                className="text-2xl @xs:text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent"
              >
                {currentRoll.total}
              </motion.span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* History */}
      {history.length > 0 && (
        <div className="flex-1 min-h-0 space-y-2">
          <div className="flex items-center gap-2">
            <History className="w-3 h-3 @xs:w-4 @xs:h-4 text-zinc-400" />
            <h4 className="text-xs @xs:text-sm font-medium text-zinc-400">History</h4>
          </div>
          <ScrollArea className="h-full max-h-32 @md:max-h-48">
            <div className="space-y-1.5">
              {history.map((roll, index) => (
                <div
                  key={roll.id}
                  className={`flex items-center justify-between gap-2 p-2 rounded-md text-xs ${
                    index === 0 ? 'bg-zinc-800/70' : 'bg-zinc-800/30'
                  }`}
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="text-zinc-500 text-xs">
                      {roll.diceCount}d{roll.diceType}
                      {roll.modifier !== 0 && (
                        <span className="text-zinc-400">
                          {roll.modifier >= 0 ? '+' : ''}{roll.modifier}
                        </span>
                      )}
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {roll.results.map((result, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center justify-center w-5 h-5 rounded text-xs font-medium bg-zinc-700 text-zinc-300"
                        >
                          {result}
                        </span>
                      ))}
                    </div>
                  </div>
                  <span className="font-bold text-zinc-100 text-sm">
                    {roll.total}
                  </span>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );
}
