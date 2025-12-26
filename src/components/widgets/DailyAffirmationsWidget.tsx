"use client";

import { useState, useCallback } from "react";
import { Sparkles, Shuffle, Heart, ChevronLeft, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "@/components/ui/button";
import { useWidgetStore } from "@/stores/widget-store";
import { cn } from "@/lib/utils";
import type { Widget } from "@/types/widget";

interface DailyAffirmationsWidgetProps {
  widget: Widget;
}

const AFFIRMATIONS = [
  "Soy capaz de lograr todo lo que me propongo.",
  "Merezco amor, respeto y felicidad.",
  "Cada dia me vuelvo mas fuerte y resiliente.",
  "Mis pensamientos crean mi realidad positiva.",
  "Soy digno/a de exito y abundancia.",
  "Acepto y amo quien soy en este momento.",
  "Tengo el poder de crear cambios positivos.",
  "Mi potencial es ilimitado.",
  "Atraigo oportunidades positivas a mi vida.",
  "Soy merecedor/a de todas las cosas buenas.",
  "Confio en el proceso de la vida.",
  "Cada dia es una nueva oportunidad para crecer.",
  "Soy fuerte, valiente y capaz.",
  "Mi vida esta llena de proposito y significado.",
  "Elijo la paz y la tranquilidad interior.",
  "Soy una persona valiosa y unica.",
  "Tengo todo lo necesario para triunfar.",
  "Mi energia positiva atrae cosas buenas.",
  "Soy resiliente y puedo superar cualquier obstaculo.",
  "Merezco tiempo para cuidar de mi mismo/a.",
  "Soy suficiente tal como soy.",
  "Celebro mis pequenos y grandes logros.",
  "Mi mente esta llena de ideas brillantes.",
  "Elijo ver lo mejor en cada situacion.",
  "Soy dueno/a de mi felicidad.",
  "Cada respiro me llena de calma y paz.",
  "Soy amable conmigo mismo/a y con los demas.",
  "Mi confianza crece cada dia.",
  "Tengo la capacidad de sanar y renovarme.",
  "Soy una fuente de inspiracion para otros.",
  "Mi corazon esta abierto al amor y la alegria.",
  "Acepto los desafios como oportunidades.",
  "Soy creativo/a y lleno/a de ideas innovadoras.",
  "Mi presencia hace la diferencia en el mundo.",
  "Elijo pensamientos que me empoderan.",
  "Soy merecedor/a de relaciones saludables.",
  "Mi cuerpo es fuerte y lleno de vitalidad.",
  "Confio en mi intuicion y sabiduria interior.",
  "Soy capaz de manejar todo lo que venga.",
  "Mi vida se desarrolla perfectamente.",
  "Soy un iman para el exito y la prosperidad.",
  "Elijo liberarme del miedo y la duda.",
  "Soy valiente para perseguir mis suenos.",
  "Mi mente es clara y enfocada.",
  "Soy agradecido/a por todo lo que tengo.",
  "Tengo el coraje de ser autentico/a.",
  "Mi felicidad viene de adentro.",
  "Soy digno/a de compasion y perdon.",
  "Cada momento es una oportunidad para empezar de nuevo.",
  "Soy luz y comparto mi brillo con el mundo.",
  "Mi camino esta lleno de bendiciones.",
  "Soy capaz de crear la vida que deseo.",
  "Elijo rodearme de energia positiva.",
  "Mi corazon esta lleno de gratitud.",
  "Soy una persona en constante evolucion.",
  "Tengo todo el tiempo que necesito.",
  "Mi espiritu es libre y lleno de esperanza.",
  "Soy merecedor/a de paz mental.",
  "Cada experiencia me hace mas sabio/a.",
  "Soy la mejor version de mi mismo/a hoy.",
];

export function DailyAffirmationsWidget({ widget }: DailyAffirmationsWidgetProps) {
  const [showFavorites, setShowFavorites] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(() =>
    Math.floor(Math.random() * AFFIRMATIONS.length)
  );
  const [direction, setDirection] = useState(0);

  const favoriteAffirmations: string[] = widget.config?.favoriteAffirmations || [];

  const saveFavorites = useCallback(
    (favorites: string[]) => {
      useWidgetStore.getState().updateWidget(widget.id, {
        config: {
          ...widget.config,
          favoriteAffirmations: favorites,
        },
      });
    },
    [widget.id, widget.config]
  );

  const currentAffirmation = showFavorites
    ? favoriteAffirmations[currentIndex % favoriteAffirmations.length] || ""
    : AFFIRMATIONS[currentIndex];

  const isFavorite = favoriteAffirmations.includes(currentAffirmation);

  const toggleFavorite = () => {
    if (isFavorite) {
      saveFavorites(favoriteAffirmations.filter((a) => a !== currentAffirmation));
    } else {
      saveFavorites([...favoriteAffirmations, currentAffirmation]);
    }
  };

  const shuffleAffirmation = () => {
    const pool = showFavorites ? favoriteAffirmations : AFFIRMATIONS;
    let newIndex;
    do {
      newIndex = Math.floor(Math.random() * pool.length);
    } while (newIndex === currentIndex && pool.length > 1);

    setDirection(1);
    setCurrentIndex(newIndex);
  };

  const navigateAffirmation = (dir: -1 | 1) => {
    const pool = showFavorites ? favoriteAffirmations : AFFIRMATIONS;
    setDirection(dir);
    setCurrentIndex((prev) => {
      const newIndex = prev + dir;
      if (newIndex < 0) return pool.length - 1;
      if (newIndex >= pool.length) return 0;
      return newIndex;
    });
  };

  const displayedList = showFavorites ? favoriteAffirmations : AFFIRMATIONS;

  const slideVariants = {
    enter: (dir: number) => ({
      x: dir > 0 ? 50 : -50,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (dir: number) => ({
      x: dir > 0 ? -50 : 50,
      opacity: 0,
    }),
  };

  return (
    <div className="@container h-full w-full">
      <div className="flex flex-col h-full p-3 @sm:p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span className="text-sm font-medium">Afirmaciones</span>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant={showFavorites ? "secondary" : "ghost"}
              size="sm"
              className="h-7 px-2"
              onClick={() => {
                setShowFavorites(!showFavorites);
                setCurrentIndex(0);
              }}
              disabled={!showFavorites && favoriteAffirmations.length === 0}
            >
              <Heart
                className={cn(
                  "w-3.5 h-3.5",
                  showFavorites && "fill-rose-500 text-rose-500"
                )}
              />
              {favoriteAffirmations.length > 0 && (
                <span className="ml-1 text-xs">{favoriteAffirmations.length}</span>
              )}
            </Button>
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 flex flex-col items-center justify-center min-h-0">
          {showFavorites && favoriteAffirmations.length === 0 ? (
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center mb-3 mx-auto">
                <Heart className="w-6 h-6 text-amber-400" />
              </div>
              <p className="text-sm text-muted-foreground">
                No tienes favoritos aun
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Guarda afirmaciones que te inspiren
              </p>
              <Button
                size="sm"
                variant="outline"
                className="mt-3"
                onClick={() => setShowFavorites(false)}
              >
                Ver todas
              </Button>
            </div>
          ) : (
            <>
              {/* Affirmation display */}
              <div className="relative w-full flex-1 flex items-center justify-center overflow-hidden px-4">
                <AnimatePresence mode="wait" custom={direction}>
                  <motion.div
                    key={currentIndex + (showFavorites ? "-fav" : "")}
                    custom={direction}
                    variants={slideVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{ duration: 0.3, ease: "easeOut" }}
                    className="text-center"
                  >
                    <p className="text-base @sm:text-lg @md:text-xl font-medium leading-relaxed">
                      &ldquo;{currentAffirmation}&rdquo;
                    </p>
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Navigation and actions */}
              <div className="flex items-center justify-center gap-2 mt-4">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9"
                  onClick={() => navigateAffirmation(-1)}
                  disabled={displayedList.length <= 1}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10"
                  onClick={toggleFavorite}
                  title={isFavorite ? "Quitar de favoritos" : "Agregar a favoritos"}
                >
                  <Heart
                    className={cn(
                      "w-5 h-5 transition-colors",
                      isFavorite
                        ? "fill-rose-500 text-rose-500"
                        : "text-muted-foreground hover:text-rose-400"
                    )}
                  />
                </Button>

                <Button
                  variant="outline"
                  size="icon"
                  className="h-10 w-10 rounded-full"
                  onClick={shuffleAffirmation}
                  disabled={displayedList.length <= 1}
                  title="Afirmacion aleatoria"
                >
                  <Shuffle className="w-4 h-4" />
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9"
                  onClick={() => navigateAffirmation(1)}
                  disabled={displayedList.length <= 1}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>

              {/* Counter */}
              <div className="flex items-center justify-center gap-1 mt-2">
                <span className="text-xs text-muted-foreground">
                  {(currentIndex % displayedList.length) + 1} / {displayedList.length}
                </span>
              </div>

              {/* Dot indicators for small lists */}
              {displayedList.length <= 10 && displayedList.length > 1 && (
                <div className="flex items-center justify-center gap-1 mt-2">
                  {displayedList.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        setDirection(index > currentIndex ? 1 : -1);
                        setCurrentIndex(index);
                      }}
                      className={cn(
                        "w-1.5 h-1.5 rounded-full transition-all",
                        index === currentIndex % displayedList.length
                          ? "w-4 bg-amber-500"
                          : "bg-muted hover:bg-muted-foreground/30"
                      )}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
