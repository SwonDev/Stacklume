/**
 * Metadata y schemas de configuración para los tipos de widget built-in.
 * Usados por el servidor MCP para que la IA sepa qué parámetros acepta cada tipo.
 */

export interface BuiltinWidgetMeta {
  type: string;
  label: string;
  description: string;
  category: string;
  defaultSize: "small" | "medium" | "large" | "wide" | "tall";
  configSchema?: Record<string, unknown>;
}

export const BUILTIN_WIDGET_CATALOG: BuiltinWidgetMeta[] = [
  // ─── Links ─────────────────────────────────────────────────────────────────
  { type: "favorites", label: "Favoritos", description: "Muestra los enlaces marcados como favoritos", category: "links", defaultSize: "medium" },
  { type: "recent", label: "Recientes", description: "Muestra los enlaces añadidos recientemente", category: "links", defaultSize: "medium", configSchema: { limit: "number (default 10)" } },
  { type: "category", label: "Categoría", description: "Muestra enlaces de una categoría específica", category: "links", defaultSize: "medium", configSchema: { categoryId: "uuid", limit: "number" } },
  { type: "tag", label: "Etiqueta", description: "Muestra enlaces con una etiqueta específica", category: "links", defaultSize: "medium", configSchema: { tagId: "uuid", limit: "number" } },
  { type: "categories", label: "Categorías", description: "Vista general de todas las categorías", category: "links", defaultSize: "wide" },
  { type: "quick-add", label: "Añadir rápido", description: "Formulario rápido para añadir nuevos enlaces", category: "links", defaultSize: "medium" },
  { type: "bookmarks", label: "Marcadores", description: "Marcadores destacados/fijados", category: "links", defaultSize: "medium" },
  { type: "random-link", label: "Enlace aleatorio", description: "Descubre un enlace aleatorio de tu colección", category: "links", defaultSize: "small" },
  { type: "link-manager", label: "Gestor de enlaces", description: "Gestión completa de enlaces con filtros", category: "links", defaultSize: "large" },
  { type: "search", label: "Búsqueda", description: "Busca entre tus enlaces guardados", category: "links", defaultSize: "medium" },
  // ─── Productivity ──────────────────────────────────────────────────────────
  { type: "clock", label: "Reloj", description: "Muestra la hora actual", category: "productivity", defaultSize: "small", configSchema: { format24Hour: "boolean", showDate: "boolean", showSeconds: "boolean", timezone: "string (IANA)" } },
  { type: "notes", label: "Notas", description: "Widget de notas de texto simple", category: "productivity", defaultSize: "medium", configSchema: { noteContent: "string" } },
  { type: "todo", label: "Lista de tareas", description: "Lista de tareas con checkboxes", category: "productivity", defaultSize: "medium" },
  { type: "pomodoro", label: "Pomodoro", description: "Temporizador Pomodoro", category: "productivity", defaultSize: "small" },
  { type: "calendar", label: "Calendario", description: "Calendario mensual", category: "productivity", defaultSize: "medium" },
  { type: "countdown", label: "Cuenta atrás", description: "Cuenta atrás a una fecha objetivo", category: "productivity", defaultSize: "small", configSchema: { targetDate: "ISO date string", label: "string" } },
  { type: "habit-tracker", label: "Hábitos", description: "Seguimiento de hábitos con rachas", category: "productivity", defaultSize: "medium" },
  { type: "progress", label: "Progreso", description: "Seguimiento de objetivos y progreso", category: "productivity", defaultSize: "medium" },
  { type: "custom", label: "Widget personalizable", description: "Widget altamente configurable con múltiples modos", category: "productivity", defaultSize: "medium" },
  // ─── Analytics ─────────────────────────────────────────────────────────────
  { type: "stats", label: "Estadísticas", description: "Estadísticas de tu colección de enlaces", category: "analytics", defaultSize: "medium" },
  { type: "link-analytics", label: "Analíticas de enlaces", description: "Distribuciones y analíticas detalladas", category: "analytics", defaultSize: "large" },
  { type: "bookmark-growth", label: "Crecimiento de marcadores", description: "Gráfico de crecimiento de marcadores", category: "analytics", defaultSize: "wide" },
  { type: "reading-streak", label: "Racha de lectura", description: "Calendario de racha de lectura", category: "analytics", defaultSize: "wide" },
  { type: "github-activity", label: "Actividad GitHub", description: "Grid de actividad estilo GitHub", category: "analytics", defaultSize: "wide" },
  { type: "tag-cloud", label: "Nube de etiquetas", description: "Visualización interactiva de etiquetas", category: "analytics", defaultSize: "medium" },
  // ─── Media ─────────────────────────────────────────────────────────────────
  { type: "youtube", label: "YouTube", description: "Embeds de vídeos de YouTube", category: "media", defaultSize: "large", configSchema: { videoId: "string", autoplay: "boolean" } },
  { type: "spotify", label: "Spotify", description: "Embeds de Spotify (pista, playlist, álbum)", category: "media", defaultSize: "medium", configSchema: { spotifyUrl: "string" } },
  { type: "codepen", label: "CodePen", description: "Embeds de snippets de CodePen", category: "media", defaultSize: "large", configSchema: { penId: "string" } },
  { type: "unsplash", label: "Unsplash", description: "Fotos aleatorias de Unsplash", category: "media", defaultSize: "medium", configSchema: { query: "string", orientation: "landscape|portrait|squarish" } },
  { type: "image", label: "Imagen", description: "Imagen o banner personalizado", category: "media", defaultSize: "wide", configSchema: { imageUrl: "string", alt: "string" } },
  { type: "embed", label: "Embed genérico", description: "Iframe/HTML embed genérico", category: "media", defaultSize: "large", configSchema: { url: "string", html: "string" } },
  // ─── Developer Tools ───────────────────────────────────────────────────────
  { type: "github-trending", label: "GitHub Trending", description: "Repositorios en tendencia en GitHub", category: "developer", defaultSize: "large", configSchema: { language: "string", period: "daily|weekly|monthly" } },
  { type: "github-search", label: "Búsqueda GitHub", description: "Búsqueda de repositorios GitHub", category: "developer", defaultSize: "large" },
  { type: "deployment-status", label: "Estado de despliegue", description: "Estado de despliegues Vercel/Netlify", category: "developer", defaultSize: "medium" },
  { type: "qr-code", label: "Código QR", description: "Generador de códigos QR", category: "developer", defaultSize: "small", configSchema: { text: "string", size: "number" } },
  { type: "json-formatter", label: "Formateador JSON", description: "Formatea y valida JSON", category: "developer", defaultSize: "large" },
  { type: "base64-tool", label: "Base64", description: "Herramienta Base64 encode/decode", category: "developer", defaultSize: "medium" },
  { type: "regex-tester", label: "Tester de Regex", description: "Probador de expresiones regulares", category: "developer", defaultSize: "large" },
  { type: "jwt-decoder", label: "Decodificador JWT", description: "Decodifica tokens JWT", category: "developer", defaultSize: "medium" },
  { type: "hash-generator", label: "Generador de hash", description: "Genera hashes MD5, SHA-1, SHA-256", category: "developer", defaultSize: "medium" },
  { type: "uuid-generator", label: "Generador UUID", description: "Genera UUIDs v1/v4", category: "developer", defaultSize: "small" },
  { type: "mcp-explorer", label: "MCP Explorer", description: "Explorador de servidores MCP para Claude Code", category: "developer", defaultSize: "large" },
  // ─── Utilities ─────────────────────────────────────────────────────────────
  { type: "weather", label: "Tiempo", description: "Información meteorológica", category: "utilities", defaultSize: "medium", configSchema: { location: "string", units: "metric|imperial" } },
  { type: "world-clock", label: "Reloj mundial", description: "Múltiples relojes de zonas horarias", category: "utilities", defaultSize: "wide" },
  { type: "quote", label: "Cita", description: "Cita inspiracional del día", category: "utilities", defaultSize: "medium" },
  { type: "crypto", label: "Criptomonedas", description: "Precios de criptomonedas en tiempo real", category: "utilities", defaultSize: "medium" },
  { type: "calculator", label: "Calculadora", description: "Calculadora simple", category: "utilities", defaultSize: "small" },
  { type: "stopwatch", label: "Cronómetro", description: "Cronómetro/temporizador", category: "utilities", defaultSize: "small" },
  { type: "color-palette", label: "Paleta de colores", description: "Gestor de paletas de colores", category: "utilities", defaultSize: "medium" },
  { type: "website-monitor", label: "Monitor de sitios", description: "Monitor de disponibilidad de sitios web", category: "utilities", defaultSize: "medium" },
  { type: "password-generator", label: "Generador de contraseñas", description: "Generador de contraseñas seguras", category: "utilities", defaultSize: "small" },
  { type: "password-manager", label: "Gestor de contraseñas", description: "Gestor de contraseñas con logins", category: "utilities", defaultSize: "large" },
  { type: "rss-feed", label: "Feed RSS", description: "Agregador de feeds RSS", category: "utilities", defaultSize: "large", configSchema: { feedUrl: "string", limit: "number" } },
  // ─── Converters ────────────────────────────────────────────────────────────
  { type: "unit-converter", label: "Conversor de unidades", description: "Convierte longitud, peso, temperatura, etc.", category: "converters", defaultSize: "medium" },
  { type: "currency-converter", label: "Conversor de divisas", description: "Conversión de divisas con tasas actuales", category: "converters", defaultSize: "medium" },
  { type: "timezone-converter", label: "Conversor de zonas horarias", description: "Convierte horas entre zonas horarias", category: "converters", defaultSize: "medium" },
  { type: "color-converter", label: "Conversor de color", description: "Convierte entre HEX, RGB, HSL", category: "converters", defaultSize: "medium" },
  { type: "number-converter", label: "Conversor de números", description: "Binario/Decimal/Hexadecimal/Octal", category: "converters", defaultSize: "medium" },
  { type: "markdown-preview", label: "Vista previa Markdown", description: "Editor Markdown con vista previa en vivo", category: "converters", defaultSize: "large" },
];

/** Devuelve el catálogo completo como string para el contexto de la IA */
export function getWidgetCatalogText(): string {
  const grouped: Record<string, BuiltinWidgetMeta[]> = {};
  for (const w of BUILTIN_WIDGET_CATALOG) {
    if (!grouped[w.category]) grouped[w.category] = [];
    grouped[w.category].push(w);
  }

  const lines: string[] = ["# Tipos de widget disponibles en Stacklume\n"];
  for (const [cat, widgets] of Object.entries(grouped)) {
    lines.push(`## ${cat.charAt(0).toUpperCase() + cat.slice(1)}`);
    for (const w of widgets) {
      const schema = w.configSchema ? ` | config: ${JSON.stringify(w.configSchema)}` : "";
      lines.push(`- **${w.type}** (${w.defaultSize}): ${w.description}${schema}`);
    }
    lines.push("");
  }
  return lines.join("\n");
}
