"use client";

import { useState, useEffect } from "react";
import { Scale, ArrowRightLeft } from "lucide-react";
import { motion } from "motion/react";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Widget } from "@/types/widget";
import { useWidgetStore } from "@/stores/widget-store";

interface UnitConverterWidgetProps {
  widget: Widget;
}

type UnitCategory = "length" | "weight" | "temperature" | "volume" | "area" | "speed" | "time" | "data";

interface UnitDefinition {
  label: string;
  toBase: (value: number) => number;
  fromBase: (value: number) => number;
}

type UnitConversions = {
  [K in UnitCategory]: {
    baseUnit: string;
    units: Record<string, UnitDefinition>;
  };
};

const conversions: UnitConversions = {
  length: {
    baseUnit: "meter",
    units: {
      meter: {
        label: "Meter (m)",
        toBase: (v) => v,
        fromBase: (v) => v,
      },
      kilometer: {
        label: "Kilometer (km)",
        toBase: (v) => v * 1000,
        fromBase: (v) => v / 1000,
      },
      centimeter: {
        label: "Centimeter (cm)",
        toBase: (v) => v / 100,
        fromBase: (v) => v * 100,
      },
      millimeter: {
        label: "Millimeter (mm)",
        toBase: (v) => v / 1000,
        fromBase: (v) => v * 1000,
      },
      mile: {
        label: "Mile (mi)",
        toBase: (v) => v * 1609.344,
        fromBase: (v) => v / 1609.344,
      },
      yard: {
        label: "Yard (yd)",
        toBase: (v) => v * 0.9144,
        fromBase: (v) => v / 0.9144,
      },
      foot: {
        label: "Foot (ft)",
        toBase: (v) => v * 0.3048,
        fromBase: (v) => v / 0.3048,
      },
      inch: {
        label: "Inch (in)",
        toBase: (v) => v * 0.0254,
        fromBase: (v) => v / 0.0254,
      },
    },
  },
  weight: {
    baseUnit: "kilogram",
    units: {
      kilogram: {
        label: "Kilogram (kg)",
        toBase: (v) => v,
        fromBase: (v) => v,
      },
      gram: {
        label: "Gram (g)",
        toBase: (v) => v / 1000,
        fromBase: (v) => v * 1000,
      },
      milligram: {
        label: "Milligram (mg)",
        toBase: (v) => v / 1000000,
        fromBase: (v) => v * 1000000,
      },
      ton: {
        label: "Metric Ton (t)",
        toBase: (v) => v * 1000,
        fromBase: (v) => v / 1000,
      },
      pound: {
        label: "Pound (lb)",
        toBase: (v) => v * 0.453592,
        fromBase: (v) => v / 0.453592,
      },
      ounce: {
        label: "Ounce (oz)",
        toBase: (v) => v * 0.0283495,
        fromBase: (v) => v / 0.0283495,
      },
      stone: {
        label: "Stone (st)",
        toBase: (v) => v * 6.35029,
        fromBase: (v) => v / 6.35029,
      },
    },
  },
  temperature: {
    baseUnit: "celsius",
    units: {
      celsius: {
        label: "Celsius (°C)",
        toBase: (v) => v,
        fromBase: (v) => v,
      },
      fahrenheit: {
        label: "Fahrenheit (°F)",
        toBase: (v) => (v - 32) * (5 / 9),
        fromBase: (v) => v * (9 / 5) + 32,
      },
      kelvin: {
        label: "Kelvin (K)",
        toBase: (v) => v - 273.15,
        fromBase: (v) => v + 273.15,
      },
    },
  },
  volume: {
    baseUnit: "liter",
    units: {
      liter: {
        label: "Liter (L)",
        toBase: (v) => v,
        fromBase: (v) => v,
      },
      milliliter: {
        label: "Milliliter (mL)",
        toBase: (v) => v / 1000,
        fromBase: (v) => v * 1000,
      },
      cubicMeter: {
        label: "Cubic Meter (m³)",
        toBase: (v) => v * 1000,
        fromBase: (v) => v / 1000,
      },
      gallon: {
        label: "Gallon (US)",
        toBase: (v) => v * 3.78541,
        fromBase: (v) => v / 3.78541,
      },
      quart: {
        label: "Quart (US)",
        toBase: (v) => v * 0.946353,
        fromBase: (v) => v / 0.946353,
      },
      pint: {
        label: "Pint (US)",
        toBase: (v) => v * 0.473176,
        fromBase: (v) => v / 0.473176,
      },
      cup: {
        label: "Cup (US)",
        toBase: (v) => v * 0.236588,
        fromBase: (v) => v / 0.236588,
      },
      fluidOunce: {
        label: "Fluid Ounce (fl oz)",
        toBase: (v) => v * 0.0295735,
        fromBase: (v) => v / 0.0295735,
      },
    },
  },
  area: {
    baseUnit: "squareMeter",
    units: {
      squareMeter: {
        label: "Square Meter (m²)",
        toBase: (v) => v,
        fromBase: (v) => v,
      },
      squareKilometer: {
        label: "Square Kilometer (km²)",
        toBase: (v) => v * 1000000,
        fromBase: (v) => v / 1000000,
      },
      squareCentimeter: {
        label: "Square Centimeter (cm²)",
        toBase: (v) => v / 10000,
        fromBase: (v) => v * 10000,
      },
      hectare: {
        label: "Hectare (ha)",
        toBase: (v) => v * 10000,
        fromBase: (v) => v / 10000,
      },
      acre: {
        label: "Acre",
        toBase: (v) => v * 4046.86,
        fromBase: (v) => v / 4046.86,
      },
      squareMile: {
        label: "Square Mile (mi²)",
        toBase: (v) => v * 2589988,
        fromBase: (v) => v / 2589988,
      },
      squareYard: {
        label: "Square Yard (yd²)",
        toBase: (v) => v * 0.836127,
        fromBase: (v) => v / 0.836127,
      },
      squareFoot: {
        label: "Square Foot (ft²)",
        toBase: (v) => v * 0.092903,
        fromBase: (v) => v / 0.092903,
      },
    },
  },
  speed: {
    baseUnit: "meterPerSecond",
    units: {
      meterPerSecond: {
        label: "Meter/Second (m/s)",
        toBase: (v) => v,
        fromBase: (v) => v,
      },
      kilometerPerHour: {
        label: "Kilometer/Hour (km/h)",
        toBase: (v) => v / 3.6,
        fromBase: (v) => v * 3.6,
      },
      milePerHour: {
        label: "Mile/Hour (mph)",
        toBase: (v) => v * 0.44704,
        fromBase: (v) => v / 0.44704,
      },
      knot: {
        label: "Knot (kn)",
        toBase: (v) => v * 0.514444,
        fromBase: (v) => v / 0.514444,
      },
      footPerSecond: {
        label: "Foot/Second (ft/s)",
        toBase: (v) => v * 0.3048,
        fromBase: (v) => v / 0.3048,
      },
    },
  },
  time: {
    baseUnit: "second",
    units: {
      second: {
        label: "Second (s)",
        toBase: (v) => v,
        fromBase: (v) => v,
      },
      millisecond: {
        label: "Millisecond (ms)",
        toBase: (v) => v / 1000,
        fromBase: (v) => v * 1000,
      },
      minute: {
        label: "Minute (min)",
        toBase: (v) => v * 60,
        fromBase: (v) => v / 60,
      },
      hour: {
        label: "Hour (h)",
        toBase: (v) => v * 3600,
        fromBase: (v) => v / 3600,
      },
      day: {
        label: "Day (d)",
        toBase: (v) => v * 86400,
        fromBase: (v) => v / 86400,
      },
      week: {
        label: "Week (wk)",
        toBase: (v) => v * 604800,
        fromBase: (v) => v / 604800,
      },
      month: {
        label: "Month (mo)",
        toBase: (v) => v * 2628000,
        fromBase: (v) => v / 2628000,
      },
      year: {
        label: "Year (yr)",
        toBase: (v) => v * 31536000,
        fromBase: (v) => v / 31536000,
      },
    },
  },
  data: {
    baseUnit: "byte",
    units: {
      byte: {
        label: "Byte (B)",
        toBase: (v) => v,
        fromBase: (v) => v,
      },
      kilobyte: {
        label: "Kilobyte (KB)",
        toBase: (v) => v * 1024,
        fromBase: (v) => v / 1024,
      },
      megabyte: {
        label: "Megabyte (MB)",
        toBase: (v) => v * 1024 * 1024,
        fromBase: (v) => v / (1024 * 1024),
      },
      gigabyte: {
        label: "Gigabyte (GB)",
        toBase: (v) => v * 1024 * 1024 * 1024,
        fromBase: (v) => v / (1024 * 1024 * 1024),
      },
      terabyte: {
        label: "Terabyte (TB)",
        toBase: (v) => v * 1024 * 1024 * 1024 * 1024,
        fromBase: (v) => v / (1024 * 1024 * 1024 * 1024),
      },
      petabyte: {
        label: "Petabyte (PB)",
        toBase: (v) => v * 1024 * 1024 * 1024 * 1024 * 1024,
        fromBase: (v) => v / (1024 * 1024 * 1024 * 1024 * 1024),
      },
      bit: {
        label: "Bit (b)",
        toBase: (v) => v / 8,
        fromBase: (v) => v * 8,
      },
      kilobit: {
        label: "Kilobit (Kb)",
        toBase: (v) => (v * 1024) / 8,
        fromBase: (v) => (v * 8) / 1024,
      },
    },
  },
};

export function UnitConverterWidget({ widget }: UnitConverterWidgetProps) {
  // Note: Use getState() for updateWidget to prevent re-render loops

  const initialCategory = (widget.config?.category as UnitCategory) || "length";
  const [category, setCategory] = useState<UnitCategory>(initialCategory);
  const [fromUnit, setFromUnit] = useState<string>(
    (widget.config?.fromUnit as string) || Object.keys(conversions[initialCategory].units)[0]
  );
  const [toUnit, setToUnit] = useState<string>(
    (widget.config?.toUnit as string) || Object.keys(conversions[initialCategory].units)[1]
  );
  const [inputValue, setInputValue] = useState<string>(
    String(widget.config?.value ?? "1")
  );
  const [result, setResult] = useState<string>("");

  // Update units when category changes
  useEffect(() => {
    const units = Object.keys(conversions[category].units);
    setFromUnit(units[0]);
    setToUnit(units[1]);
  }, [category]);

  // Perform conversion
  useEffect(() => {
    const numValue = parseFloat(inputValue);
    if (isNaN(numValue)) {
      setResult("");
      return;
    }

    const categoryData = conversions[category];
    const fromUnitData = categoryData.units[fromUnit];
    const toUnitData = categoryData.units[toUnit];

    if (!fromUnitData || !toUnitData) {
      setResult("");
      return;
    }

    // Convert to base unit, then to target unit
    const baseValue = fromUnitData.toBase(numValue);
    const convertedValue = toUnitData.fromBase(baseValue);

    // Format result with appropriate precision
    const formattedResult =
      convertedValue % 1 === 0
        ? convertedValue.toString()
        : convertedValue.toFixed(6).replace(/\.?0+$/, "");

    setResult(formattedResult);
  }, [inputValue, category, fromUnit, toUnit]);

  // Save config changes
  useEffect(() => {
    const numValue = parseFloat(inputValue);
    useWidgetStore.getState().updateWidget(widget.id, {
      config: {
        ...widget.config,
        category,
        fromUnit,
        toUnit,
        value: isNaN(numValue) ? 1 : numValue,
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, fromUnit, toUnit, inputValue, widget.id]);

  const handleSwapUnits = () => {
    setFromUnit(toUnit);
    setToUnit(fromUnit);
    setInputValue(result || "0");
  };

  const currentUnits = conversions[category].units;

  return (
    <div className="@container flex h-full flex-col gap-3 p-4 @sm:gap-4 @sm:p-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Scale className="h-4 w-4 text-muted-foreground @sm:h-5 @sm:w-5" />
        <h3 className="text-sm font-semibold @sm:text-base">Unit Converter</h3>
      </div>

      {/* Category Tabs */}
      <Tabs value={category} onValueChange={(v) => setCategory(v as UnitCategory)}>
        <TabsList className="grid h-auto w-full grid-cols-4 gap-1 p-1 @sm:grid-cols-8">
          <TabsTrigger value="length" className="text-[10px] @sm:text-xs">
            Length
          </TabsTrigger>
          <TabsTrigger value="weight" className="text-[10px] @sm:text-xs">
            Weight
          </TabsTrigger>
          <TabsTrigger value="temperature" className="text-[10px] @sm:text-xs">
            Temp
          </TabsTrigger>
          <TabsTrigger value="volume" className="text-[10px] @sm:text-xs">
            Volume
          </TabsTrigger>
          <TabsTrigger value="area" className="text-[10px] @sm:text-xs">
            Area
          </TabsTrigger>
          <TabsTrigger value="speed" className="text-[10px] @sm:text-xs">
            Speed
          </TabsTrigger>
          <TabsTrigger value="time" className="text-[10px] @sm:text-xs">
            Time
          </TabsTrigger>
          <TabsTrigger value="data" className="text-[10px] @sm:text-xs">
            Data
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Conversion Interface */}
      <div className="flex flex-1 flex-col gap-3 @sm:gap-4">
        {/* From Unit */}
        <div className="space-y-2">
          <Label htmlFor="from-unit" className="text-xs @sm:text-sm">
            From
          </Label>
          <Select value={fromUnit} onValueChange={setFromUnit}>
            <SelectTrigger id="from-unit" className="text-xs @sm:text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(currentUnits).map(([key, unit]) => (
                <SelectItem key={key} value={key} className="text-xs @sm:text-sm">
                  {unit.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            type="number"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Enter value"
            className="text-sm @sm:text-base"
          />
        </div>

        {/* Swap Button */}
        <div className="flex justify-center">
          <Button
            variant="outline"
            size="icon"
            onClick={handleSwapUnits}
            className="h-8 w-8 rounded-full @sm:h-10 @sm:w-10"
          >
            <motion.div
              whileHover={{ rotate: 180 }}
              transition={{ duration: 0.3 }}
            >
              <ArrowRightLeft className="h-3 w-3 @sm:h-4 @sm:w-4" />
            </motion.div>
          </Button>
        </div>

        {/* To Unit */}
        <div className="space-y-2">
          <Label htmlFor="to-unit" className="text-xs @sm:text-sm">
            To
          </Label>
          <Select value={toUnit} onValueChange={setToUnit}>
            <SelectTrigger id="to-unit" className="text-xs @sm:text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(currentUnits).map(([key, unit]) => (
                <SelectItem key={key} value={key} className="text-xs @sm:text-sm">
                  {unit.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <motion.div
            key={result}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="rounded-md border bg-muted/50 px-3 py-2 text-sm font-medium @sm:px-4 @sm:py-3 @sm:text-base"
          >
            {result || "0"}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
