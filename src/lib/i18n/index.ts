import { useSettingsStore } from "@/stores/settings-store";
import es, { type TranslationKey } from "./es";
import en from "./en";

const translations: Record<string, Record<TranslationKey, string>> = { es, en };

/**
 * Lightweight i18n hook that reads the language from the settings store.
 * Reactive: re-renders automatically when the user switches language.
 *
 * Usage:
 *   const { t, language } = useTranslation();
 *   t("nav.home")              // "Inicio" or "Home"
 *   t("sidebar.savedLinks", { count: 42 }) // "42 enlaces guardados"
 */
export function useTranslation() {
  const language = useSettingsStore((s) => s.language) || "es";

  const t = (key: TranslationKey, params?: Record<string, string | number>): string => {
    let text: string = translations[language]?.[key] ?? translations.es[key] ?? key;
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        text = text.replace(`{{${k}}}`, String(v));
      }
    }
    return text;
  };

  return { t, language } as const;
}

export type { TranslationKey };
