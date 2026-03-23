/**
 * Paleta de colores expandida para etiquetas y categorías.
 * 40 colores vibrantes y distinguibles, ordenados para maximizar
 * el contraste entre colores consecutivos.
 */
export const TAG_COLORS = [
  // Azules
  "#3b82f6", "#2563eb", "#1d4ed8", "#60a5fa",
  // Verdes
  "#10b981", "#059669", "#22c55e", "#34d399",
  // Violetas
  "#8b5cf6", "#7c3aed", "#a855f7", "#c084fc",
  // Ámbar/Naranja
  "#f59e0b", "#f97316", "#fb923c", "#fbbf24",
  // Rojos/Rosa
  "#ef4444", "#dc2626", "#ec4899", "#f43f5e",
  // Cyan/Teal
  "#06b6d4", "#0891b2", "#14b8a6", "#2dd4bf",
  // Índigo
  "#6366f1", "#4f46e5", "#818cf8",
  // Lima
  "#84cc16", "#65a30d", "#a3e635",
  // Fucsia
  "#d946ef", "#c026d3",
  // Slate/Gris
  "#64748b", "#475569",
  // Esmeralda
  "#047857", "#6ee7b7",
  // Sky
  "#0ea5e9", "#38bdf8",
  // Rose
  "#e11d48", "#fb7185",
  // Warm
  "#ea580c", "#78350f",
];

/** Paleta de colores para categorías (subconjunto más suave). */
export const CATEGORY_COLORS = [
  "#3b82f6", "#10b981", "#8b5cf6", "#f59e0b", "#ef4444",
  "#06b6d4", "#ec4899", "#6366f1", "#22c55e", "#f97316",
  "#a855f7", "#14b8a6", "#84cc16", "#d946ef", "#0ea5e9",
  "#64748b", "#e11d48", "#059669", "#7c3aed", "#f43f5e",
];

/** Devuelve un color aleatorio de la paleta de tags. */
export function randomTagColor(): string {
  return TAG_COLORS[Math.floor(Math.random() * TAG_COLORS.length)];
}

/** Devuelve un color de la paleta de tags por índice (cíclico). */
export function tagColorByIndex(index: number): string {
  return TAG_COLORS[index % TAG_COLORS.length];
}

/** Devuelve un color de la paleta de categorías por índice (cíclico). */
export function categoryColorByIndex(index: number): string {
  return CATEGORY_COLORS[index % CATEGORY_COLORS.length];
}
