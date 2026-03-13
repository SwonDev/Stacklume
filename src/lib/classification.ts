/**
 * Motor de autoclasificación de enlaces.
 *
 * Aplica las reglas activas de la tabla `classification_rules` al recibir
 * un enlace nuevo y devuelve las acciones a aplicar (categoría e etiquetas).
 */

import { eq } from "drizzle-orm";
import { db, withRetry, classificationRules } from "@/lib/db";
import type { ClassificationRule } from "@/lib/db";

export interface LinkCandidate {
  url: string;
  title: string;
  platform?: string | null;
}

export interface ClassificationResult {
  /** ID de categoría a asignar (solo si el usuario no especificó una) */
  categoryId: string | null;
  /** IDs de etiquetas a añadir */
  tagIds: string[];
}

/** Evalúa si un enlace cumple la condición de una regla. */
function testCondition(rule: ClassificationRule, link: LinkCandidate): boolean {
  const val = rule.conditionValue;
  switch (rule.conditionType) {
    case "url_pattern":
      try {
        return new RegExp(val, "i").test(link.url);
      } catch {
        return false;
      }
    case "title_keyword":
      return link.title.toLowerCase().includes(val.toLowerCase());
    case "platform":
      return (link.platform ?? "").toLowerCase() === val.toLowerCase();
    case "domain":
      try {
        const hostname = new URL(link.url).hostname.replace(/^www\./, "");
        return hostname.toLowerCase() === val.toLowerCase().replace(/^www\./, "");
      } catch {
        return false;
      }
    default:
      return false;
  }
}

/**
 * Carga todas las reglas activas y las aplica al enlace candidato.
 * Las reglas se procesan en orden; la primera regla `set_category` gana
 * (las siguientes no sobreescriben). Las reglas `add_tag` se acumulan.
 *
 * @param link Datos básicos del enlace a clasificar.
 * @param userCategoryId Categoría ya indicada por el usuario (tiene prioridad).
 * @returns Resultado con categoryId y tagIds a aplicar.
 */
export async function applyClassificationRules(
  link: LinkCandidate,
  userCategoryId?: string | null
): Promise<ClassificationResult> {
  const result: ClassificationResult = { categoryId: null, tagIds: [] };

  let rules: ClassificationRule[];
  try {
    rules = await withRetry(
      () =>
        db
          .select()
          .from(classificationRules)
          .where(eq(classificationRules.isActive, true))
          .orderBy(classificationRules.order),
      { operationName: "load classification rules" }
    );
  } catch {
    // Si falla la carga de reglas, no bloquear la creación del enlace
    return result;
  }

  for (const rule of rules) {
    if (!testCondition(rule, link)) continue;

    if (rule.actionType === "set_category") {
      // La categoría del usuario siempre tiene prioridad
      if (!result.categoryId && !userCategoryId) {
        result.categoryId = rule.actionValue;
      }
    } else if (rule.actionType === "add_tag") {
      if (!result.tagIds.includes(rule.actionValue)) {
        result.tagIds.push(rule.actionValue);
      }
    }
  }

  return result;
}
