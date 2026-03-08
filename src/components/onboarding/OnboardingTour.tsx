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
import { useTranslation } from "@/lib/i18n";
import { useSettingsStore } from "@/stores/settings-store";

const STORAGE_KEY = "stacklume-onboarding-completed";

export interface TourStep {
  id: string;
  targetSelector: string;
  titleKey: string;
  descriptionKey: string;
  icon?: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  fallbackSelector?: string;
}

const DEFAULT_TOUR_STEPS: TourStep[] = [
  {
    id: "welcome",
    targetSelector: "[data-tour='header-logo']",
    fallbackSelector: "header",
    icon: Sparkles,
    titleKey: "onboarding.welcomeTitle",
    descriptionKey: "onboarding.welcomeDescription",
  },
  {
    id: "widgets",
    targetSelector: "[data-tour='add-widget-button']",
    fallbackSelector: "[data-slot='button']:has(svg)",
    icon: LayoutGrid,
    titleKey: "onboarding.widgetsTitle",
    descriptionKey: "onboarding.widgetsDescription",
  },
  {
    id: "links",
    targetSelector: "[data-tour='add-link-button']",
    fallbackSelector: "button:has(svg[class*='plus'])",
    icon: Bookmark,
    titleKey: "onboarding.linksTitle",
    descriptionKey: "onboarding.linksDescription",
  },
  {
    id: "search",
    targetSelector: "[data-tour='search-input']",
    fallbackSelector: "input[placeholder*='Buscar']",
    icon: Search,
    titleKey: "onboarding.searchTitle",
    descriptionKey: "onboarding.searchDescription",
  },
  {
    id: "edit-mode",
    targetSelector: "[data-tour='edit-mode-button']",
    fallbackSelector: "button:has(svg[class*='pen'])",
    icon: PenLine,
    titleKey: "onboarding.editModeTitle",
    descriptionKey: "onboarding.editModeDescription",
  },
  {
    id: "view-modes",
    targetSelector: "[data-tour='settings-button']",
    fallbackSelector: "[data-slot='dropdown-menu-trigger']",
    icon: LayoutDashboard,
    titleKey: "onboarding.viewModesTitle",
    descriptionKey: "onboarding.viewModesDescription",
  },
  {
    id: "settings",
    targetSelector: "[data-tour='settings-button']",
    fallbackSelector: "[data-slot='dropdown-menu-trigger']",
    icon: Settings2,
    titleKey: "onboarding.settingsTitle",
    descriptionKey: "onboarding.settingsDescription",
  },
  {
    id: "ready",
    targetSelector: "[data-tour='header-logo']",
    fallbackSelector: "header",
    icon: Rocket,
    titleKey: "onboarding.readyTitle",
    descriptionKey: "onboarding.readyDescription",
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
  const { t } = useTranslation();
  const onboardingCompleted = useSettingsStore((s) => s.onboardingCompleted);
  const settingsInitialized = useSettingsStore((s) => s.isInitialized);
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setMounted(true);
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  // Activar tour solo tras confirmar que los settings están cargados desde la DB
  useEffect(() => {
    if (!mounted) return;

    if (forceShow) {
      setIsActive(true);
      return;
    }

    // Esperar a que settings esté inicializado para leer el valor real de la DB
    if (!settingsInitialized) return;

    if (!onboardingCompleted) {
      const timer = setTimeout(() => setIsActive(true), 1000);
      return () => clearTimeout(timer);
    }
  }, [mounted, forceShow, settingsInitialized, onboardingCompleted]);

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
    useSettingsStore.getState().setOnboardingCompleted(true);
    setIsActive(false);
    setCurrentStep(0);
    onComplete?.();
  }, [onComplete]);

  const handleSkip = useCallback(() => {
    useSettingsStore.getState().setOnboardingCompleted(true);
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
      title={t(step.titleKey)}
      description={t(step.descriptionKey)}
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
    useSettingsStore.getState().setOnboardingCompleted(false);
  }, []);

  const isTourCompleted = useCallback(() => {
    return useSettingsStore.getState().onboardingCompleted;
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
