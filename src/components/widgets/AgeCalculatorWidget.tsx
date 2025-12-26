"use client";

import { useState, useEffect } from "react";
import { Cake, Calendar, Star, Clock } from "lucide-react";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import type { Widget } from "@/types/widget";
import { useWidgetStore } from "@/stores/widget-store";

interface AgeCalculatorWidgetProps {
  widget: Widget;
}

interface AgeData {
  years: number;
  months: number;
  days: number;
  totalDays: number;
  totalWeeks: number;
  daysUntilNextBirthday: number;
  zodiacSign: string;
  dayOfWeekBorn: string;
  lifePercentage: number;
}

const ZODIAC_SIGNS = [
  { name: "Capricornio", start: [1, 1], end: [1, 19] },
  { name: "Acuario", start: [1, 20], end: [2, 18] },
  { name: "Piscis", start: [2, 19], end: [3, 20] },
  { name: "Aries", start: [3, 21], end: [4, 19] },
  { name: "Tauro", start: [4, 20], end: [5, 20] },
  { name: "Géminis", start: [5, 21], end: [6, 20] },
  { name: "Cáncer", start: [6, 21], end: [7, 22] },
  { name: "Leo", start: [7, 23], end: [8, 22] },
  { name: "Virgo", start: [8, 23], end: [9, 22] },
  { name: "Libra", start: [9, 23], end: [10, 22] },
  { name: "Escorpio", start: [10, 23], end: [11, 21] },
  { name: "Sagitario", start: [11, 22], end: [12, 21] },
  { name: "Capricornio", start: [12, 22], end: [12, 31] },
];

const getZodiacSign = (month: number, day: number): string => {
  for (const sign of ZODIAC_SIGNS) {
    const [startMonth, startDay] = sign.start;
    const [endMonth, endDay] = sign.end;

    if (
      (month === startMonth && day >= startDay) ||
      (month === endMonth && day <= endDay) ||
      (month > startMonth && month < endMonth)
    ) {
      return sign.name;
    }
  }
  return "Desconocido";
};

const calculateAge = (birthDate: Date): AgeData => {
  const now = new Date();
  const birth = new Date(birthDate);

  // Calculate years, months, days
  let years = now.getFullYear() - birth.getFullYear();
  let months = now.getMonth() - birth.getMonth();
  let days = now.getDate() - birth.getDate();

  if (days < 0) {
    months--;
    const lastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    days += lastMonth.getDate();
  }

  if (months < 0) {
    years--;
    months += 12;
  }

  // Calculate total days lived
  const millisecondsPerDay = 1000 * 60 * 60 * 24;
  const totalDays = Math.floor((now.getTime() - birth.getTime()) / millisecondsPerDay);

  // Calculate total weeks lived
  const totalWeeks = Math.floor(totalDays / 7);

  // Calculate days until next birthday
  let nextBirthday = new Date(now.getFullYear(), birth.getMonth(), birth.getDate());
  if (nextBirthday < now) {
    nextBirthday = new Date(now.getFullYear() + 1, birth.getMonth(), birth.getDate());
  }
  const daysUntilNextBirthday = Math.ceil(
    (nextBirthday.getTime() - now.getTime()) / millisecondsPerDay
  );

  // Get zodiac sign
  const zodiacSign = getZodiacSign(birth.getMonth() + 1, birth.getDate());

  // Get day of week born on
  const dayOfWeekBorn = birth.toLocaleDateString("es-ES", { weekday: "long" });

  // Calculate life percentage (assuming 80 years average lifespan)
  const averageLifespan = 80;
  const lifePercentage = Math.min((years / averageLifespan) * 100, 100);

  return {
    years,
    months,
    days,
    totalDays,
    totalWeeks,
    daysUntilNextBirthday,
    zodiacSign,
    dayOfWeekBorn,
    lifePercentage,
  };
};

export function AgeCalculatorWidget({ widget }: AgeCalculatorWidgetProps) {
  const { updateWidget } = useWidgetStore();
  const [birthDate, setBirthDate] = useState<string>("");
  const [ageData, setAgeData] = useState<AgeData | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Load birth date from widget config
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const savedBirthDate = widget.config?.birthDate;
      if (savedBirthDate) {
        setBirthDate(savedBirthDate);
        const date = new Date(savedBirthDate);
        if (!isNaN(date.getTime())) {
          setAgeData(calculateAge(date));
        }
      } else {
        setIsEditing(true);
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [widget.config]);

  // Recalculate age every second
  useEffect(() => {
    if (!birthDate) return;

    const timer = setInterval(() => {
      const date = new Date(birthDate);
      if (!isNaN(date.getTime())) {
        setAgeData(calculateAge(date));
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [birthDate]);

  const handleSaveBirthDate = () => {
    if (!birthDate) return;

    const date = new Date(birthDate);
    if (isNaN(date.getTime())) {
      alert("Por favor, ingresa una fecha válida");
      return;
    }

    // Save to widget config
    updateWidget(widget.id, {
      config: {
        birthDate: birthDate,
      },
    });

    setAgeData(calculateAge(date));
    setIsEditing(false);
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleClear = () => {
    setBirthDate("");
    setAgeData(null);
    setIsEditing(true);
    updateWidget(widget.id, {
      config: {
        birthDate: "",
      },
    });
  };

  return (
    <div className="@container h-full w-full">
      <div className="flex flex-col h-full w-full p-3 @sm:p-4 @md:p-5 @lg:p-6">
        {/* Input Form */}
        {isEditing || !ageData ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center h-full gap-4 @sm:gap-5"
          >
            <div className="w-12 h-12 @md:w-14 @md:h-14 rounded-full bg-primary/10 flex items-center justify-center">
              <Cake className="w-6 h-6 @md:w-7 @md:h-7 text-primary" />
            </div>

            <div className="w-full max-w-xs space-y-3 @sm:space-y-4">
              <div className="space-y-2">
                <Label htmlFor="birthdate" className="text-xs @sm:text-sm font-medium">
                  Fecha de nacimiento
                </Label>
                <Input
                  id="birthdate"
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  max={new Date().toISOString().split("T")[0]}
                  className="w-full text-xs @sm:text-sm"
                />
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleSaveBirthDate}
                  disabled={!birthDate}
                  className="flex-1 text-xs @sm:text-sm"
                >
                  Calcular edad
                </Button>
                {ageData && (
                  <Button
                    onClick={() => setIsEditing(false)}
                    variant="outline"
                    className="text-xs @sm:text-sm"
                  >
                    Cancelar
                  </Button>
                )}
              </div>
            </div>
          </motion.div>
        ) : (
          /* Age Display */
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col h-full gap-3 @sm:gap-4 @lg:gap-5"
          >
            {/* Header with Icon */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 @sm:gap-3">
                <div className="w-8 h-8 @sm:w-10 @sm:h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Cake className="w-4 h-4 @sm:w-5 @sm:h-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-xs @sm:text-sm font-medium text-muted-foreground">
                    Tu edad
                  </h3>
                </div>
              </div>
              <div className="flex gap-1 @sm:gap-2">
                <Button
                  onClick={handleEdit}
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs @sm:h-8 @sm:px-3"
                >
                  Editar
                </Button>
                <Button
                  onClick={handleClear}
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs @sm:h-8 @sm:px-3"
                >
                  Limpiar
                </Button>
              </div>
            </div>

            {/* Main Age Display */}
            <div className="flex-1 flex flex-col justify-center gap-4 @sm:gap-5 @lg:gap-6">
              {/* Years, Months, Days */}
              <div className="flex items-center justify-center gap-2 @sm:gap-3 @md:gap-4">
                <div className="text-center">
                  <motion.div
                    key={ageData.years}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="text-3xl @sm:text-4xl @md:text-5xl @lg:text-6xl font-bold text-primary tabular-nums"
                  >
                    {ageData.years}
                  </motion.div>
                  <div className="text-[10px] @sm:text-xs text-muted-foreground mt-1">
                    {ageData.years === 1 ? "año" : "años"}
                  </div>
                </div>

                <div className="text-2xl @sm:text-3xl @md:text-4xl @lg:text-5xl font-bold text-muted-foreground/30">
                  :
                </div>

                <div className="text-center">
                  <motion.div
                    key={ageData.months}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="text-3xl @sm:text-4xl @md:text-5xl @lg:text-6xl font-bold text-primary tabular-nums"
                  >
                    {ageData.months}
                  </motion.div>
                  <div className="text-[10px] @sm:text-xs text-muted-foreground mt-1">
                    {ageData.months === 1 ? "mes" : "meses"}
                  </div>
                </div>

                <div className="text-2xl @sm:text-3xl @md:text-4xl @lg:text-5xl font-bold text-muted-foreground/30">
                  :
                </div>

                <div className="text-center">
                  <motion.div
                    key={ageData.days}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="text-3xl @sm:text-4xl @md:text-5xl @lg:text-6xl font-bold text-primary tabular-nums"
                  >
                    {ageData.days}
                  </motion.div>
                  <div className="text-[10px] @sm:text-xs text-muted-foreground mt-1">
                    {ageData.days === 1 ? "día" : "días"}
                  </div>
                </div>
              </div>

              {/* Statistics Grid */}
              <div className="grid grid-cols-2 gap-2 @sm:gap-3 @md:grid-cols-4">
                {/* Total Days */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="bg-muted/50 rounded-lg p-2 @sm:p-3 text-center"
                >
                  <Clock className="w-3 h-3 @sm:w-4 @sm:h-4 text-primary mx-auto mb-1 @sm:mb-1.5" />
                  <div className="text-lg @sm:text-xl @md:text-2xl font-bold tabular-nums">
                    {ageData.totalDays.toLocaleString()}
                  </div>
                  <div className="text-[9px] @sm:text-[10px] @md:text-xs text-muted-foreground mt-0.5">
                    días vividos
                  </div>
                </motion.div>

                {/* Total Weeks */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="bg-muted/50 rounded-lg p-2 @sm:p-3 text-center"
                >
                  <Calendar className="w-3 h-3 @sm:w-4 @sm:h-4 text-primary mx-auto mb-1 @sm:mb-1.5" />
                  <div className="text-lg @sm:text-xl @md:text-2xl font-bold tabular-nums">
                    {ageData.totalWeeks.toLocaleString()}
                  </div>
                  <div className="text-[9px] @sm:text-[10px] @md:text-xs text-muted-foreground mt-0.5">
                    semanas
                  </div>
                </motion.div>

                {/* Next Birthday */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="bg-muted/50 rounded-lg p-2 @sm:p-3 text-center"
                >
                  <Cake className="w-3 h-3 @sm:w-4 @sm:h-4 text-primary mx-auto mb-1 @sm:mb-1.5" />
                  <div className="text-lg @sm:text-xl @md:text-2xl font-bold tabular-nums">
                    {ageData.daysUntilNextBirthday}
                  </div>
                  <div className="text-[9px] @sm:text-[10px] @md:text-xs text-muted-foreground mt-0.5">
                    días para cumpleaños
                  </div>
                </motion.div>

                {/* Zodiac Sign */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="bg-muted/50 rounded-lg p-2 @sm:p-3 text-center"
                >
                  <Star className="w-3 h-3 @sm:w-4 @sm:h-4 text-primary mx-auto mb-1 @sm:mb-1.5" />
                  <div className="text-sm @sm:text-base @md:text-lg font-semibold">
                    {ageData.zodiacSign}
                  </div>
                  <div className="text-[9px] @sm:text-[10px] @md:text-xs text-muted-foreground mt-0.5">
                    signo zodiacal
                  </div>
                </motion.div>
              </div>

              {/* Day of Week Born - Hidden on smallest containers */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="hidden @sm:block text-center"
              >
                <div className="text-xs @md:text-sm text-muted-foreground">
                  Naciste un{" "}
                  <span className="font-semibold capitalize">{ageData.dayOfWeekBorn}</span>
                </div>
              </motion.div>

              {/* Life Percentage Progress */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="space-y-2"
              >
                <div className="flex items-center justify-between text-xs @sm:text-sm text-muted-foreground">
                  <span>Progreso de vida (80 años)</span>
                  <span className="font-semibold tabular-nums">
                    {ageData.lifePercentage.toFixed(1)}%
                  </span>
                </div>
                <Progress value={ageData.lifePercentage} className="h-2 @sm:h-2.5" />
              </motion.div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
