"use client";

import { useState, useCallback, useEffect } from "react";
import type { Widget } from "@/types/widget";
import { useWidgetStore } from "@/stores/widget-store";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "motion/react";
import { Delete, History, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface CalculatorWidgetProps {
  widget: Widget;
}

type Operation = "+" | "-" | "*" | "/" | null;

export function CalculatorWidget({ widget }: CalculatorWidgetProps) {
  // Note: Use getState() for updateWidget to prevent re-render loops
  const [display, setDisplay] = useState("0");
  const [previousValue, setPreviousValue] = useState<number | null>(null);
  const [operation, setOperation] = useState<Operation>(null);
  const [waitingForOperand, setWaitingForOperand] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [error, setError] = useState(false);

  // Load history from widget config
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      if (widget.config?.history) {
        setHistory(widget.config.history);
      }
      if (widget.config?.lastResult) {
        setDisplay(widget.config.lastResult);
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [widget.config]);

  // Save state to widget config
  const saveState = useCallback(
    (newDisplay: string, newHistory?: string[]) => {
      useWidgetStore.getState().updateWidget(widget.id, {
        config: {
          ...widget.config,
          lastResult: newDisplay,
          history: newHistory || history,
        },
      });
    },
    [widget.id, widget.config, history]
  );

  const inputDigit = useCallback(
    (digit: string) => {
      if (error) {
        setError(false);
        setDisplay(digit);
        setWaitingForOperand(false);
        return;
      }

      if (waitingForOperand) {
        setDisplay(digit);
        setWaitingForOperand(false);
      } else {
        setDisplay(display === "0" ? digit : display + digit);
      }
    },
    [display, waitingForOperand, error]
  );

  const inputDecimal = useCallback(() => {
    if (error) {
      setError(false);
      setDisplay("0.");
      setWaitingForOperand(false);
      return;
    }

    if (waitingForOperand) {
      setDisplay("0.");
      setWaitingForOperand(false);
    } else if (display.indexOf(".") === -1) {
      setDisplay(display + ".");
    }
  }, [display, waitingForOperand, error]);

  const clearDisplay = useCallback(() => {
    setDisplay("0");
    setPreviousValue(null);
    setOperation(null);
    setWaitingForOperand(false);
    setError(false);
  }, []);

  const _clearEntry = useCallback(() => {
    setDisplay("0");
    setError(false);
  }, []);

  const performOperation = useCallback(
    (nextOperation: Operation) => {
      const inputValue = parseFloat(display);

      if (error) {
        setError(false);
        setPreviousValue(inputValue);
        setOperation(nextOperation);
        setWaitingForOperand(true);
        return;
      }

      if (previousValue === null) {
        setPreviousValue(inputValue);
      } else if (operation) {
        const currentValue = previousValue;
        let newValue = 0;
        let historyEntry = "";

        try {
          switch (operation) {
            case "+":
              newValue = currentValue + inputValue;
              historyEntry = `${currentValue} + ${inputValue} = ${newValue}`;
              break;
            case "-":
              newValue = currentValue - inputValue;
              historyEntry = `${currentValue} - ${inputValue} = ${newValue}`;
              break;
            case "*":
              newValue = currentValue * inputValue;
              historyEntry = `${currentValue} × ${inputValue} = ${newValue}`;
              break;
            case "/":
              if (inputValue === 0) {
                setError(true);
                setDisplay("Error");
                setOperation(null);
                setPreviousValue(null);
                setWaitingForOperand(false);
                return;
              }
              newValue = currentValue / inputValue;
              historyEntry = `${currentValue} ÷ ${inputValue} = ${newValue}`;
              break;
          }

          // Round to avoid floating point errors
          newValue = Math.round(newValue * 100000000) / 100000000;

          const newHistory = [historyEntry, ...history].slice(0, 20);
          setHistory(newHistory);
          setDisplay(String(newValue));
          setPreviousValue(newValue);
          saveState(String(newValue), newHistory);
        } catch {
          setError(true);
          setDisplay("Error");
          setPreviousValue(null);
        }
      }

      setWaitingForOperand(true);
      setOperation(nextOperation);
    },
    [display, previousValue, operation, history, saveState, error]
  );

  const toggleSign = useCallback(() => {
    if (error) return;
    const value = parseFloat(display);
    setDisplay(String(value * -1));
  }, [display, error]);

  const inputPercent = useCallback(() => {
    if (error) return;
    const value = parseFloat(display);
    setDisplay(String(value / 100));
  }, [display, error]);

  const backspace = useCallback(() => {
    if (error) {
      setError(false);
      setDisplay("0");
      return;
    }

    if (display.length > 1) {
      setDisplay(display.slice(0, -1));
    } else {
      setDisplay("0");
    }
  }, [display, error]);

  // Keyboard support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= "0" && e.key <= "9") {
        inputDigit(e.key);
      } else if (e.key === ".") {
        inputDecimal();
      } else if (e.key === "+" || e.key === "-" || e.key === "*" || e.key === "/") {
        performOperation(e.key as Operation);
      } else if (e.key === "Enter" || e.key === "=") {
        performOperation(null);
      } else if (e.key === "Escape") {
        clearDisplay();
      } else if (e.key === "Backspace") {
        backspace();
      } else if (e.key === "%") {
        inputPercent();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [inputDigit, inputDecimal, performOperation, clearDisplay, backspace, inputPercent]);

  const buttonClass =
    "h-full w-full text-sm @sm:text-base @md:text-lg font-semibold transition-all active:scale-95 rounded-md";

  const numberButtonClass = cn(
    buttonClass,
    "bg-secondary hover:bg-secondary/80 text-foreground"
  );

  const operationButtonClass = cn(
    buttonClass,
    "bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20"
  );

  const specialButtonClass = cn(
    buttonClass,
    "bg-muted hover:bg-muted/80 text-muted-foreground"
  );

  const equalsButtonClass = cn(
    buttonClass,
    "bg-primary hover:bg-primary/90 text-primary-foreground"
  );

  return (
    <div className="@container h-full w-full">
      <div className="flex flex-col h-full w-full p-2 @sm:p-3 @md:p-4 gap-2 @sm:gap-3">
        {/* Display */}
        <div className="relative bg-secondary/30 rounded-lg border border-border/50 backdrop-blur-sm overflow-hidden">
          <div className="absolute top-2 right-2 @sm:top-3 @sm:right-3 flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowHistory(!showHistory)}
              className="h-6 w-6 @sm:h-7 @sm:w-7 p-0 hover:bg-secondary/80"
              title="History"
            >
              <History className="w-3 h-3 @sm:w-3.5 @sm:h-3.5" />
            </Button>
          </div>

          <div className="p-3 @sm:p-4 @md:p-5">
            {/* Operation indicator */}
            {operation && previousValue !== null && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-xs @sm:text-sm text-muted-foreground mb-1 flex items-center gap-1 font-mono"
              >
                <span>{previousValue}</span>
                <span className="text-primary">
                  {operation === "*" ? "×" : operation === "/" ? "÷" : operation}
                </span>
              </motion.div>
            )}

            {/* Main display */}
            <AnimatePresence mode="wait">
              <motion.div
                key={display}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.05 }}
                transition={{ duration: 0.15 }}
                className={cn(
                  "text-right text-2xl @sm:text-3xl @md:text-4xl @lg:text-5xl font-bold tracking-tight font-mono break-all",
                  error ? "text-destructive" : "text-foreground"
                )}
              >
                {display.length > 12 ? display.slice(0, 12) + "..." : display}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* History panel */}
          <AnimatePresence>
            {showHistory && history.length > 0 && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="border-t border-border/50 bg-secondary/20 overflow-hidden"
              >
                <div className="max-h-32 @sm:max-h-40 overflow-y-auto p-2 @sm:p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-muted-foreground font-medium">
                      History
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setHistory([]);
                        saveState(display, []);
                      }}
                      className="h-5 px-2 text-xs"
                    >
                      <X className="w-3 h-3 mr-1" />
                      Clear
                    </Button>
                  </div>
                  <div className="space-y-1">
                    {history.map((entry, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.03 }}
                        className="text-xs @sm:text-sm text-muted-foreground font-mono"
                      >
                        {entry}
                      </motion.div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Buttons */}
        <div className="flex-1 grid grid-cols-4 gap-1.5 @sm:gap-2 @md:gap-2.5 min-h-0">
          {/* Row 1 */}
          <Button
            onClick={clearDisplay}
            className={specialButtonClass}
            title="Clear (Esc)"
          >
            C
          </Button>
          <Button
            onClick={toggleSign}
            className={specialButtonClass}
            title="Toggle sign"
          >
            +/-
          </Button>
          <Button
            onClick={inputPercent}
            className={specialButtonClass}
            title="Percent (%)"
          >
            %
          </Button>
          <Button
            onClick={() => performOperation("/")}
            className={operationButtonClass}
            title="Divide (/)"
          >
            ÷
          </Button>

          {/* Row 2 */}
          <Button onClick={() => inputDigit("7")} className={numberButtonClass}>
            7
          </Button>
          <Button onClick={() => inputDigit("8")} className={numberButtonClass}>
            8
          </Button>
          <Button onClick={() => inputDigit("9")} className={numberButtonClass}>
            9
          </Button>
          <Button
            onClick={() => performOperation("*")}
            className={operationButtonClass}
            title="Multiply (*)"
          >
            ×
          </Button>

          {/* Row 3 */}
          <Button onClick={() => inputDigit("4")} className={numberButtonClass}>
            4
          </Button>
          <Button onClick={() => inputDigit("5")} className={numberButtonClass}>
            5
          </Button>
          <Button onClick={() => inputDigit("6")} className={numberButtonClass}>
            6
          </Button>
          <Button
            onClick={() => performOperation("-")}
            className={operationButtonClass}
            title="Subtract (-)"
          >
            -
          </Button>

          {/* Row 4 */}
          <Button onClick={() => inputDigit("1")} className={numberButtonClass}>
            1
          </Button>
          <Button onClick={() => inputDigit("2")} className={numberButtonClass}>
            2
          </Button>
          <Button onClick={() => inputDigit("3")} className={numberButtonClass}>
            3
          </Button>
          <Button
            onClick={() => performOperation("+")}
            className={operationButtonClass}
            title="Add (+)"
          >
            +
          </Button>

          {/* Row 5 */}
          <Button
            onClick={backspace}
            className={cn(specialButtonClass, "col-span-1")}
            title="Backspace"
          >
            <Delete className="w-4 h-4 @sm:w-5 @sm:h-5" />
          </Button>
          <Button onClick={() => inputDigit("0")} className={numberButtonClass}>
            0
          </Button>
          <Button
            onClick={inputDecimal}
            className={numberButtonClass}
            title="Decimal (.)"
          >
            .
          </Button>
          <Button
            onClick={() => performOperation(null)}
            className={equalsButtonClass}
            title="Equals (Enter)"
          >
            =
          </Button>
        </div>

        {/* Empty state hint for very small containers */}
        {display === "0" && !operation && (
          <div className="hidden @xs:block text-center">
            <p className="text-xs text-muted-foreground/50">
              Use keyboard or click buttons
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
