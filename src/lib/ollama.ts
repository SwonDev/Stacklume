export const OLLAMA_DEFAULT_URL = "http://localhost:11434";

export interface OllamaContextLink {
  id: string;
  title: string | null;
  url: string;
  description: string | null;
  categoryId: string | null;
  tags?: { name: string }[];
  isFavorite?: boolean;
}

export interface OllamaContextCategory {
  id: string;
  name: string;
}

export interface OllamaContextTag {
  id: string;
  name: string;
}

/** Puntúa un enlace por relevancia a una consulta (scoring léxico simple) */
function scoreLink(link: OllamaContextLink, query: string): number {
  const words = query.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
  if (words.length === 0) return 0;
  const fullText = `${link.title ?? ""} ${link.description ?? ""} ${link.url} ${link.tags?.map((t) => t.name).join(" ") ?? ""}`.toLowerCase();
  let score = 0;
  for (const word of words) {
    if (link.title?.toLowerCase().includes(word)) score += 3;
    else if (fullText.includes(word)) score += 1;
  }
  return score;
}

/** Construye el system prompt para Ollama con toda la biblioteca del usuario */
export function buildOllamaSystemPrompt(params: {
  links: OllamaContextLink[];
  categories: OllamaContextCategory[];
  tags: OllamaContextTag[];
  userQuery?: string;
}): string {
  const { links, categories, tags, userQuery } = params;

  // Seleccionar los más relevantes si hay muchos
  const MAX_LINKS = 250;
  let selectedLinks = links;
  if (links.length > MAX_LINKS && userQuery) {
    const scored = links
      .map((l) => ({ l, s: scoreLink(l, userQuery) }))
      .sort((a, b) => b.s - a.s);
    // Top relevantes + los más recientes (tail) para consultas generales
    selectedLinks = [
      ...scored.slice(0, MAX_LINKS - 30).map((x) => x.l),
      ...links.slice(-30),
    ].filter((l, i, arr) => arr.indexOf(l) === i);
  } else if (links.length > MAX_LINKS) {
    selectedLinks = links.slice(0, MAX_LINKS);
  }

  const categoriesSection =
    categories.length > 0
      ? `### Categorías del usuario (${categories.length})\n${categories.map((c) => `- ${c.name}`).join("\n")}`
      : "### Categorías\nEl usuario no tiene categorías creadas aún.";

  const tagsSection =
    tags.length > 0
      ? `### Etiquetas del usuario (${tags.length})\n${tags.map((t) => `- ${t.name}`).join("\n")}`
      : "### Etiquetas\nEl usuario no tiene etiquetas creadas aún.";

  const linksSection =
    selectedLinks.length > 0
      ? `### Biblioteca de enlaces (${links.length} total${links.length > selectedLinks.length ? `, mostrando ${selectedLinks.length} relevantes` : ""})\n` +
        selectedLinks
          .map((l) => {
            const catName = categories.find((c) => c.id === l.categoryId)?.name ?? "";
            const tagsList = l.tags?.map((t) => t.name).join(", ") ?? "";
            const desc = l.description ? ` — ${l.description.slice(0, 100)}` : "";
            const fav = l.isFavorite ? " ⭐" : "";
            return `- [${l.title ?? l.url}](${l.url})${catName ? ` [${catName}]` : ""}${tagsList ? ` #${tagsList}` : ""}${fav}${desc}`;
          })
          .join("\n")
      : "### Biblioteca de enlaces\nEl usuario no tiene enlaces guardados aún.";

  return `Eres el asistente IA integrado en Stacklume, una app de escritorio para gestión de recursos web y herramientas de desarrollo.

## Sobre Stacklume
Stacklume permite guardar URLs (bookmarks) con metadatos automáticos (título, descripción, imagen, favicon), organizarlas en categorías y etiquetas, y visualizarlas en un dashboard tipo bento grid con 190+ widgets personalizables (productividad, devtools, analíticas, etc.). Tiene app de escritorio nativa (Windows), extensión de navegador para guardar con un clic, múltiples workspaces/proyectos, y servidor MCP para integración con Claude y Cursor.

## Tu misión
1. Ayudar al usuario a sacar el máximo partido de su biblioteca personal de recursos guardados
2. Cuando recomiendes herramientas, busca PRIMERO en la biblioteca del usuario y cita el título y URL exactos del enlace guardado
3. Si no hay nada relevante en la biblioteca, díselo claramente y da una recomendación general útil
4. Detecta patrones en la colección (qué tecnologías domina, qué le falta, qué tiene sin categorizar)
5. Responde en español salvo que el usuario escriba en otro idioma
6. Sé conciso y útil; cuando listes recursos usa formato markdown con los URLs como enlaces

## Datos actuales del usuario en Stacklume

${categoriesSection}

${tagsSection}

${linksSection}`;
}
