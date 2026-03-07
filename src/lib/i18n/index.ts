import { useSettingsStore } from "@/stores/settings-store";
import esTranslations from "./es.json";
import enTranslations from "./en.json";

type TranslationKey = keyof typeof esTranslations;

const translations: Record<string, Record<string, string>> = {
  es: esTranslations,
  en: enTranslations,
};

/**
 * Hook de internacionalización.
 * Lee el idioma del settings store y devuelve una función `t(key, params?)`.
 * Soporta interpolación: `t("header.deleteAllWidgetsDesc", { count: 5 })`
 */
export function useTranslation() {
  const language = useSettingsStore((state) => state.language) || "es";

  const t = (key: TranslationKey | string, params?: Record<string, string | number>): string => {
    let value = translations[language]?.[key] ?? translations.es[key] ?? key;
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        value = value.replace(`{{${k}}}`, String(v));
      }
    }
    return value;
  };

  return { t, language };
}
