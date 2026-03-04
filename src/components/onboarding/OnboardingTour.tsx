"use client";

import { useEffect, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  Sparkles,
  LayoutGrid,
  Bookmark,
  Search,
  PenLine,
  LayoutDashboard,
  Settings2,
  Rocket,
} from "lucide-react";
import { OnboardingTooltip } from "./OnboardingTooltip";

const STORAGE_KEY = "stacklume-onboarding-completed";

export interface TourStep {
  id: string;
  targetSelector: string;
  title: string;
  description: string;
  icon?: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  fallbackSelector?: string;
}

const DEFAULT_TOUR_STEPS: TourStep[] = [
  {
    id: "welcome",
    targetSelector: "[data-tour='header-logo']",
    fallbackSelector: "header",
    icon: Sparkles,
    title: "¡Bienvenido a Stacklume!",
    description:
      "Tu panel de control personal para organizar enlaces, herramientas y recursos. Te guiamos por lo esencial en menos de un minuto.",
  },
  {
    id: "widgets",
    targetSelector: "[data-tour='add-widget-button']",
    fallbackSelector: "[data-slot='button']:has(svg)",
    icon: LayoutGrid,
    title: "Tu librería de widgets",
    description:
      "Más de 120 tipos disponibles: notas, relojes, herramientas de desarrollo, gráficos SVG... y widgets personalizados creados por IA a través de la integración MCP.",
  },
  {
    id: "links",
    targetSelector: "[data-tour='add-link-button']",
    fallbackSelector: "button:has(svg[class*='plus'])",
    icon: Bookmark,
    title: "Gestión de enlaces",
    description:
      "Guarda cualquier URL con un clic. Stacklume detecta automáticamente el tipo de contenido — YouTube, GitHub, Spotify, Steam — y extrae título, imagen y metadatos.",
  },
  {
    id: "search",
    targetSelector: "[data-tour='search-input']",
    fallbackSelector: "input[placeholder*='Buscar']",
    icon: Search,
    title: "Búsqueda instantánea",
    description:
      "Usa Ctrl+K (o Cmd+K en Mac) para abrir la búsqueda rápida. Encuentra cualquier enlace, widget o categoría al instante sin mover las manos del teclado.",
  },
  {
    id: "edit-mode",
    targetSelector: "[data-tour='edit-mode-button']",
    fallbackSelector: "button:has(svg[class*='pen'])",
    icon: PenLine,
    title: "Modo edición",
    description:
      "Activa el modo edición para reorganizar y redimensionar widgets libremente en la cuadrícula. Arrastra, ajusta el tamaño y bloquea posiciones. Los cambios se guardan automáticamente.",
  },
  {
    id: "view-modes",
    targetSelector: "[data-tour='settings-button']",
    fallbackSelector: "[data-slot='dropdown-menu-trigger']",
    icon: LayoutDashboard,
    title: "Tres formas de ver tu espacio",
    description:
      "Desde Configuración → Modo de vista puedes cambiar entre Bento (cuadrícula libre), Kanban (columnas de flujo de trabajo) y Lista (vista detallada con filtros y ordenación).",
  },
  {
    id: "settings",
    targetSelector: "[data-tour='settings-button']",
    fallbackSelector: "[data-slot='dropdown-menu-trigger']",
    icon: Settings2,
    title: "Personalización total",
    description:
      "13 temas visuales (oscuros y claros), integración de IA vía MCP para Claude y Cursor, backups automáticos, gestión de proyectos y mucho más. Todo desde Configuración.",
  },
  {
    id: "ready",
    targetSelector: "[data-tour='header-logo']",
    fallbackSelector: "header",
    icon: Rocket,
    title: "¡Todo listo para empezar!",
    description:
      "Ya tienes todo lo que necesitas. Puedes volver a este tutorial en cualquier momento desde Configuración → Reiniciar tutorial. ¡Disfruta de Stacklume!",
  },
];

interface OnboardingTourProps {
  steps?: TourStep[];
  onComplete?: () => void;
  onSkip?: () => void;
  forceShow?: boolean;
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

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setMounted(true);

      if (forceShow) {
        setIsActive(true);
        return;
      }

      const completed = localStorage.getItem(STORAGE_KEY);
      if (!completed) {
        setTimeout(() => {
          setIsActive(true);
        }, 1000);
      }
    });

    return () => cancelAnimationFrame(frame);
  }, [forceShow]);

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
      icon={step.icon}
    />,
    document.body
  );
}

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

export { STORAGE_KEY as ONBOARDING_STORAGE_KEY };
