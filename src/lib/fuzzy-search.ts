/**
 * Fuzzy search — búsqueda difusa sin dependencias externas.
 *
 * fuzzyMatch(query, text) devuelve un score 0–1:
 *   1   = substring exacto encontrado
 *   0.x = todos los caracteres del query aparecen en orden
 *   0   = no coincide
 *
 * fuzzySearch() filtra y ordena una lista de elementos usando fuzzyMatch.
 */

/**
 * Calcula un score de coincidencia difusa entre `query` y `text`.
 * @returns Un número entre 0 y 1. 0 = sin coincidencia, 1 = coincidencia exacta.
 */
export function fuzzyMatch(query: string, text: string): number {
  if (!query || !text) return 0;

  const q = query.toLowerCase();
  const t = text.toLowerCase();

  // Coincidencia exacta de substring → score máximo
  if (t.includes(q)) return 1;

  // Buscar todos los caracteres del query en orden dentro del texto
  let qi = 0;
  let consecutiveBonus = 0;
  let score = 0;

  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) {
      qi++;
      consecutiveBonus++;
      score += consecutiveBonus;
    } else {
      consecutiveBonus = 0;
    }
  }

  // Si no se encontraron todos los caracteres del query → sin coincidencia
  if (qi < q.length) return 0;

  // Normalizar: el score máximo posible es q.length*(q.length+1)/2 (todos consecutivos)
  // Usamos q.length² para un rango más amplio
  const maxScore = q.length * q.length;
  return Math.min(score / maxScore, 0.99); // Cap en 0.99 para que substring exacto (1.0) siempre gane
}

/**
 * Filtra y ordena una lista de elementos usando búsqueda difusa.
 *
 * @param items - Lista de elementos a filtrar
 * @param query - Texto de búsqueda
 * @param getTexts - Función que extrae los textos buscables de cada elemento
 * @param threshold - Score mínimo para incluir un resultado (default 0.3)
 * @returns Elementos filtrados y ordenados por relevancia (mayor score primero)
 */
export function fuzzySearch<T>(
  items: T[],
  query: string,
  getTexts: (item: T) => string[],
  threshold = 0.3
): T[] {
  if (!query.trim()) return items;

  return items
    .map((item) => {
      const texts = getTexts(item);
      const maxScore = Math.max(0, ...texts.map((t) => fuzzyMatch(query, t)));
      return { item, score: maxScore };
    })
    .filter((r) => r.score >= threshold)
    .sort((a, b) => b.score - a.score)
    .map((r) => r.item);
}
