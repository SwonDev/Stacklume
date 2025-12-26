"use client";

import { useState, useEffect } from "react";
import {
  Cloud,
  CloudRain,
  CloudSnow,
  Sun,
  CloudDrizzle,
  Wind,
  Droplets,
  MapPin,
  RefreshCw,
  Thermometer
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Widget } from "@/types/widget";
import { useWidgetStore } from "@/stores/widget-store";

interface WeatherWidgetProps {
  widget: Widget;
}

interface WeatherData {
  location: string;
  temperature: number;
  condition: WeatherCondition;
  humidity: number;
  windSpeed: number;
  feelsLike: number;
}

type WeatherCondition =
  | "sunny"
  | "cloudy"
  | "rainy"
  | "drizzle"
  | "snow"
  | "windy";

// Map WMO weather codes to our conditions
const getConditionFromCode = (code: number): WeatherCondition => {
  if (code === 0 || code === 1) return "sunny";
  if (code >= 2 && code <= 3) return "cloudy";
  if (code >= 45 && code <= 48) return "cloudy"; // Fog
  if (code >= 51 && code <= 55) return "drizzle";
  if (code >= 56 && code <= 57) return "drizzle"; // Freezing drizzle
  if (code >= 61 && code <= 65) return "rainy";
  if (code >= 66 && code <= 67) return "rainy"; // Freezing rain
  if (code >= 71 && code <= 77) return "snow";
  if (code >= 80 && code <= 82) return "rainy"; // Rain showers
  if (code >= 85 && code <= 86) return "snow"; // Snow showers
  if (code >= 95 && code <= 99) return "rainy"; // Thunderstorm
  return "cloudy";
};

// Geocoding API to get coordinates from city name
const geocodeCity = async (city: string): Promise<{ lat: number; lon: number; name: string } | null> => {
  try {
    const response = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=es&format=json`
    );
    const data = await response.json();
    if (data.results && data.results.length > 0) {
      return {
        lat: data.results[0].latitude,
        lon: data.results[0].longitude,
        name: data.results[0].name,
      };
    }
    return null;
  } catch (error) {
    console.error("Geocoding error:", error);
    return null;
  }
};

// Fetch weather from Open-Meteo API
const fetchWeatherData = async (lat: number, lon: number, locationName: string): Promise<WeatherData | null> => {
  try {
    const response = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&timezone=auto`
    );
    const data = await response.json();

    if (data.current) {
      return {
        location: locationName,
        temperature: Math.round(data.current.temperature_2m),
        condition: getConditionFromCode(data.current.weather_code),
        humidity: data.current.relative_humidity_2m,
        windSpeed: Math.round(data.current.wind_speed_10m),
        feelsLike: Math.round(data.current.apparent_temperature),
      };
    }
    return null;
  } catch (error) {
    console.error("Weather fetch error:", error);
    return null;
  }
};

const WeatherIcon = ({
  condition,
  className = ""
}: {
  condition: WeatherCondition;
  className?: string;
}) => {
  const icons: Record<WeatherCondition, typeof Sun> = {
    sunny: Sun,
    cloudy: Cloud,
    rainy: CloudRain,
    drizzle: CloudDrizzle,
    snow: CloudSnow,
    windy: Wind,
  };

  const Icon = icons[condition];
  return <Icon className={className} />;
};

const getWeatherColor = (condition: WeatherCondition): string => {
  const colors: Record<WeatherCondition, string> = {
    sunny: "text-yellow-500",
    cloudy: "text-gray-400",
    rainy: "text-blue-500",
    drizzle: "text-blue-400",
    snow: "text-cyan-300",
    windy: "text-slate-400",
  };
  return colors[condition];
};

const getWeatherGradient = (condition: WeatherCondition): string => {
  const gradients: Record<WeatherCondition, string> = {
    sunny: "from-yellow-500/10 to-orange-500/10",
    cloudy: "from-gray-400/10 to-slate-500/10",
    rainy: "from-blue-500/10 to-indigo-500/10",
    drizzle: "from-blue-400/10 to-sky-500/10",
    snow: "from-cyan-300/10 to-blue-400/10",
    windy: "from-slate-400/10 to-gray-500/10",
  };
  return gradients[condition];
};

export function WeatherWidget({ widget }: WeatherWidgetProps) {
  const { updateWidget } = useWidgetStore();
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [locationInput, setLocationInput] = useState("");
  const [useGeolocation, setUseGeolocation] = useState(false);

  // Load weather data on mount
  useEffect(() => {
    const savedLocation = widget.config?.location;
    const savedLat = widget.config?.lat;
    const savedLon = widget.config?.lon;

    if (savedLat && savedLon && savedLocation) {
      loadWeatherForCoordinates(savedLat, savedLon, savedLocation);
    } else if (savedLocation) {
      loadWeatherForLocation(savedLocation);
    } else {
      // Default location - Madrid
      loadWeatherForLocation("Madrid");
    }
  }, [widget.config?.location, widget.config?.lat, widget.config?.lon]);

  const loadWeatherForCoordinates = async (lat: number, lon: number, locationName: string) => {
    setIsLoading(true);
    try {
      const data = await fetchWeatherData(lat, lon, locationName);
      if (data) {
        setWeatherData(data);
      }
    } catch (error) {
      console.error("Error loading weather:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadWeatherForLocation = async (location: string) => {
    setIsLoading(true);
    try {
      const geoData = await geocodeCity(location);
      if (geoData) {
        // Save coordinates for future use
        updateWidget(widget.id, {
          config: {
            ...widget.config,
            lat: geoData.lat,
            lon: geoData.lon,
            location: geoData.name,
          },
        });

        const weatherData = await fetchWeatherData(geoData.lat, geoData.lon, geoData.name);
        if (weatherData) {
          setWeatherData(weatherData);
        }
      } else {
        console.error("Could not find location:", location);
      }
    } catch (error) {
      console.error("Error loading weather:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLocationSubmit = () => {
    if (!locationInput.trim()) return;
    loadWeatherForLocation(locationInput.trim());
    setIsEditing(false);
    setLocationInput("");
  };

  const handleRefresh = () => {
    const savedLat = widget.config?.lat;
    const savedLon = widget.config?.lon;
    const savedLocation = widget.config?.location;

    if (savedLat && savedLon && savedLocation) {
      loadWeatherForCoordinates(savedLat, savedLon, savedLocation);
    } else if (weatherData) {
      loadWeatherForLocation(weatherData.location);
    }
  };

  const handleGeolocation = () => {
    if (!navigator.geolocation) {
      console.log("Geolocation not supported");
      return;
    }

    setIsLoading(true);
    setUseGeolocation(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;

        // Reverse geocode to get location name
        try {
          const response = await fetch(
            `https://geocoding-api.open-meteo.com/v1/reverse?latitude=${latitude}&longitude=${longitude}&language=es&format=json`
          );
          const data = await response.json();
          const locationName = data.results?.[0]?.name || "Mi ubicación";

          updateWidget(widget.id, {
            config: {
              ...widget.config,
              lat: latitude,
              lon: longitude,
              location: locationName,
              useGeolocation: true,
            },
          });

          await loadWeatherForCoordinates(latitude, longitude, locationName);
        } catch (error) {
          console.error("Reverse geocoding error:", error);
          // Fallback: use coordinates directly
          updateWidget(widget.id, {
            config: {
              ...widget.config,
              lat: latitude,
              lon: longitude,
              location: "Mi ubicación",
              useGeolocation: true,
            },
          });
          await loadWeatherForCoordinates(latitude, longitude, "Mi ubicación");
        }

        setUseGeolocation(false);
      },
      (error) => {
        console.error("Geolocation error:", error);
        setIsLoading(false);
        setUseGeolocation(false);
      }
    );
  };

  if (isEditing) {
    return (
      <div className="@container h-full w-full">
        <div className="flex flex-col items-center justify-center h-full p-4 gap-4">
          <MapPin className="w-8 h-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground text-center">
            Ingresa una ciudad
          </p>
          <div className="w-full max-w-xs space-y-3">
            <Input
              value={locationInput}
              onChange={(e) => setLocationInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLocationSubmit()}
              placeholder="ej: Barcelona, London"
              className="text-center"
              autoFocus
            />
            <div className="flex gap-2">
              <Button
                onClick={handleLocationSubmit}
                className="flex-1"
                size="sm"
                disabled={!locationInput.trim()}
              >
                Confirmar
              </Button>
              <Button
                onClick={() => setIsEditing(false)}
                variant="outline"
                size="sm"
              >
                Cancelar
              </Button>
            </div>
            <Button
              onClick={handleGeolocation}
              variant="outline"
              size="sm"
              className="w-full gap-2"
              disabled={useGeolocation}
            >
              <MapPin className="w-4 h-4" />
              Usar mi ubicación
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading || !weatherData) {
    return (
      <div className="@container h-full w-full">
        <div className="flex items-center justify-center h-full">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          >
            <RefreshCw className="w-6 h-6 text-muted-foreground" />
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="@container h-full w-full">
      <div className={`flex flex-col h-full w-full bg-gradient-to-br ${getWeatherGradient(weatherData.condition)} relative overflow-hidden`}>
        {/* Header with location */}
        <div className="flex items-center justify-between p-3 @sm:p-4">
          <button
            onClick={() => setIsEditing(true)}
            className="flex items-center gap-2 text-xs @sm:text-sm font-medium text-foreground hover:text-primary transition-colors group"
          >
            <MapPin className="w-3 h-3 @sm:w-4 @sm:h-4 group-hover:scale-110 transition-transform" />
            <span className="truncate max-w-[120px] @sm:max-w-[160px]">
              {weatherData.location}
            </span>
          </button>

          <Button
            onClick={handleRefresh}
            variant="ghost"
            size="sm"
            className="h-7 w-7 @sm:h-8 @sm:w-8 p-0"
          >
            <RefreshCw className="w-3 h-3 @sm:w-4 @sm:h-4" />
          </Button>
        </div>

        {/* Main weather display */}
        <div className="flex-1 flex flex-col items-center justify-center px-3 @sm:px-4 pb-3 @sm:pb-4">
          {/* Weather icon */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="mb-2 @sm:mb-3 @md:mb-4"
          >
            <WeatherIcon
              condition={weatherData.condition}
              className={`w-12 h-12 @sm:w-16 @sm:h-16 @md:w-20 @md:h-20 @lg:w-24 @lg:h-24 ${getWeatherColor(weatherData.condition)}`}
            />
          </motion.div>

          {/* Temperature */}
          <AnimatePresence mode="wait">
            <motion.div
              key={weatherData.temperature}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              className="text-4xl @sm:text-5xl @md:text-6xl @lg:text-7xl font-bold text-foreground tabular-nums"
            >
              {weatherData.temperature}°
            </motion.div>
          </AnimatePresence>

          {/* Condition */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-sm @sm:text-base @md:text-lg text-muted-foreground mt-1 @sm:mt-2 capitalize"
          >
            {weatherData.condition === "sunny" && "Soleado"}
            {weatherData.condition === "cloudy" && "Nublado"}
            {weatherData.condition === "rainy" && "Lluvioso"}
            {weatherData.condition === "drizzle" && "Llovizna"}
            {weatherData.condition === "snow" && "Nevado"}
            {weatherData.condition === "windy" && "Ventoso"}
          </motion.div>

          {/* Feels like - visible on medium+ containers */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="hidden @md:flex items-center gap-1 mt-2 text-xs @lg:text-sm text-muted-foreground"
          >
            <Thermometer className="w-3 h-3 @lg:w-4 @lg:h-4" />
            Sensación: {weatherData.feelsLike}°
          </motion.div>
        </div>

        {/* Weather details - visible on larger containers */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="hidden @sm:grid grid-cols-2 gap-2 @md:gap-3 px-3 @sm:px-4 pb-3 @sm:pb-4 border-t bg-background/5 backdrop-blur-sm"
        >
          <div className="flex items-center gap-2 @md:gap-3 py-2 @md:py-3">
            <div className="w-8 h-8 @md:w-10 @md:h-10 rounded-full bg-background/10 flex items-center justify-center">
              <Droplets className="w-4 h-4 @md:w-5 @md:h-5 text-blue-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Humedad</p>
              <p className="text-sm @md:text-base font-semibold">
                {weatherData.humidity}%
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 @md:gap-3 py-2 @md:py-3">
            <div className="w-8 h-8 @md:w-10 @md:h-10 rounded-full bg-background/10 flex items-center justify-center">
              <Wind className="w-4 h-4 @md:w-5 @md:h-5 text-slate-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Viento</p>
              <p className="text-sm @md:text-base font-semibold">
                {weatherData.windSpeed} km/h
              </p>
            </div>
          </div>
        </motion.div>

        {/* Compact details for small containers */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="flex @sm:hidden items-center justify-around px-3 pb-3 pt-2 border-t bg-background/5 backdrop-blur-sm text-xs"
        >
          <div className="flex items-center gap-1">
            <Droplets className="w-3 h-3 text-blue-500" />
            <span>{weatherData.humidity}%</span>
          </div>
          <div className="flex items-center gap-1">
            <Wind className="w-3 h-3 text-slate-500" />
            <span>{weatherData.windSpeed} km/h</span>
          </div>
        </motion.div>

              </div>
    </div>
  );
}
