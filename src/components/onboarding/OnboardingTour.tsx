"use client";

import { useEffect, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { OnboardingTooltip } from "./OnboardingTooltip";

const STORAGE_KEY = "stacklume-onboarding-completed";

// Define tour steps
export interface TourStep {
  id: string;
  targetSelector: string;
  title: string;
  description: string;
  fallbackSelector?: string; // If primary selector not found
}

const DEFAULT_TOUR_STEPS: TourStep[] = [
  {
    id: "welcome",
    targetSelector: "[data-tour='header-logo']",
    fallbackSelector: "header",
    title: "Bienvenido a Stacklume",
    description:
      "Tu nuevo panel de control para organizar enlaces, herramientas y recursos de desarrollo. Te guiaremos por las funciones principales.",
  },
  {
    id: "add-widget",
    targetSelector: "[data-tour='add-widget-button']",
    fallbackSelector: "[data-slot='button']:has(svg)",
    title: "Agregar Widgets",
    description:
      "Haz clic aqui para agregar nuevos widgets a tu panel. Hay mas de 120 tipos disponibles: notas, relojes, calculadoras, herramientas de desarrollo y mucho mas.",
  },
  {
    id: "add-link",
    targetSelector: "[data-tour='add-link-button']",
    fallbackSelector: "button:has(svg[class*='plus'])",
    title: "Agregar Enlaces",
    description:
      "Guarda tus enlaces favoritos rapidamente. Stacklume detecta automaticamente el tipo de contenido (YouTube, GitHub, Spotify, etc.) y extrae metadatos.",
  },
  {
    id: "search",
    targetSelector: "[data-tour='search-input']",
    fallbackSelector: "input[placeholder*='Buscar']",
    title: "Buscar",
    description:
      "Usa Cmd/Ctrl + K para abrir la busqueda rapidamente. Encuentra enlaces, widgets y categorias al instante.",
  },
  {
    id: "view-modes",
    targetSelector: "[data-tour='view-mode-toggle']",
    fallbackSelector: "[data-slot='toggle-group']",
    title: "Modos de Vista",
    description:
      "Alterna entre vista Bento (cuadricula arrastrable), Kanban (columnas) o Lista segun tu preferencia de trabajo.",
  },
  {
    id: "edit-mode",
    targetSelector: "[data-tour='edit-mode-button']",
    fallbackSelector: "button:has(svg[class*='pen'])",
    title: "Modo Edicion",
    description:
      "Activa el modo edicion para reorganizar, redimensionar o eliminar widgets. Tus cambios se guardan automaticamente.",
  },
  {
    id: "settings",
    targetSelector: "[data-tour='settings-button']",
    fallbackSelector: "[data-slot='dropdown-menu-trigger']",
    title: "Configuracion",
    description:
      "Personaliza el tema, densidad de vista, atajos de teclado y mas. Aqui tambien puedes ver el estado de tu base de datos y configurar backups.",
  },
  {
    id: "database",
    targetSelector: "[data-tour='settings-button']",
    fallbackSelector: "[data-slot='dropdown-menu-trigger']",
    title: "Base de Datos",
    description:
      "Tus datos se guardan en Neon PostgreSQL (gratis). Si no configuraste una base de datos, tus datos se guardan localmente en el navegador. Puedes configurar la base de datos en cualquier momento desde Configuracion.",
  },
];

interface OnboardingTourProps {
  steps?: TourStep[];
  onComplete?: () => void;
  onSkip?: () => void;
  forceShow?: boolean; // For testing/demo purposes
}

export function OnboardingTour({
  steps = DEFAULT_TOUR_STEPS,
  onComplete,
  onSkip,
  forceShow = false,
}: OnboardingTourProps) {
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [mounted, setMounted] = useState(false);

  // Check if onboarding should be shown
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setMounted(true);

      if (forceShow) {
        setIsActive(true);
        return;
      }

      // Check localStorage for completion status
      const completed = localStorage.getItem(STORAGE_KEY);
      if (!completed) {
        // Small delay to let the UI render first
        setTimeout(() => {
          setIsActive(true);
        }, 1000);
      }
    });

    return () => cancelAnimationFrame(frame);
  }, [forceShow]);

  // Define callbacks before the effect that uses them
  const handleNext = useCallback(() => {
    if (currentStep < steps.length - 1) {
      setCurrentStep((prev) => prev + 1);
    }
  }, [currentStep, steps.length]);

  const handlePrevious = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  }, [currentStep]);

  const handleComplete = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, "true");
    setIsActive(false);
    setCurrentStep(0);
    onComplete?.();
  }, [onComplete]);

  const handleSkip = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, "true");
    setIsActive(false);
    setCurrentStep(0);
    onSkip?.();
  }, [onSkip]);

  // Handle keyboard navigation
  useEffect(() => {
    if (!isActive) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      switch (event.key) {
        case "Escape":
          handleSkip();
          break;
        case "ArrowRight":
        case "Enter":
          if (currentStep < steps.length - 1) {
            handleNext();
          } else {
            handleComplete();
          }
          break;
        case "ArrowLeft":
          if (currentStep > 0) {
            handlePrevious();
          }
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isActive, currentStep, steps.length, handleNext, handlePrevious, handleComplete, handleSkip]);

  // Find valid selector for current step
  const getCurrentSelector = useCallback(() => {
    const step = steps[currentStep];
    const primaryTarget = document.querySelector(step.targetSelector);
    if (primaryTarget) return step.targetSelector;

    if (step.fallbackSelector) {
      const fallbackTarget = document.querySelector(step.fallbackSelector);
      if (fallbackTarget) return step.fallbackSelector;
    }

    return step.targetSelector;
  }, [currentStep, steps]);

  if (!mounted || !isActive) return null;

  const step = steps[currentStep];

  return createPortal(
    <OnboardingTooltip
      targetSelector={getCurrentSelector()}
      title={step.title}
      description={step.description}
      step={currentStep + 1}
      totalSteps={steps.length}
      onNext={handleNext}
      onPrevious={handlePrevious}
      onSkip={handleSkip}
      onComplete={handleComplete}
      isFirst={currentStep === 0}
      isLast={currentStep === steps.length - 1}
    />,
    document.body
  );
}

// Hook to control onboarding tour programmatically
export function useOnboardingTour() {
  const [showTour, setShowTour] = useState(false);

  const startTour = useCallback(() => {
    setShowTour(true);
  }, []);

  const resetTour = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const isTourCompleted = useCallback(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(STORAGE_KEY) === "true";
  }, []);

  return {
    showTour,
    startTour,
    resetTour,
    isTourCompleted,
    TourComponent: showTour ? (
      <OnboardingTour
        forceShow
        onComplete={() => setShowTour(false)}
        onSkip={() => setShowTour(false)}
      />
    ) : null,
  };
}

// Export storage key for external use
export { STORAGE_KEY as ONBOARDING_STORAGE_KEY };
