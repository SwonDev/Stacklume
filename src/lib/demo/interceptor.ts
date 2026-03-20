/**
 * Demo Mode — Interceptor de fetch
 *
 * Intercepta todas las llamadas a /api/* y las redirige a la capa de
 * almacenamiento localStorage (demo/storage.ts). El servidor nunca recibe
 * estas peticiones: los datos son 100% privados en el dispositivo del usuario.
 *
 * Rutas que SÍ pasan al servidor (no son CRUD de datos del usuario):
 * - /api/scrape         → necesita internet para obtener metadatos de URLs
 * - /api/github-*       → APIs externas de GitHub
 * - /api/steam-games    → Steam API
 * - /api/nintendo-deals → Nintendo API
 * - /api/health         → health check
 * - /api/mcp            → MCP server
 */

import {
  demoLinks,
  demoCategories,
  demoTags,
  demoLinkTags,
  demoWidgets,
  demoProjects,
  demoSettings,
  demoClassificationRules,
  demoLinkSessions,
  demoPageArchives,
} from "./storage";

// ─── Helper: crear una Response JSON ─────────────────────────────────────────

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// ─── Rutas que pasan al servidor real ────────────────────────────────────────

const PASSTHROUGH_PREFIXES = [
  "/api/scrape",
  "/api/github-",
  "/api/steam-",
  "/api/health",
  "/api/mcp",
];

function shouldPassthrough(pathname: string): boolean {
  return PASSTHROUGH_PREFIXES.some((p) => pathname.startsWith(p));
}

// ─── Router del interceptor ───────────────────────────────────────────────────

async function handleDemoRequest(
  url: URL,
  method: string,
  body: unknown
): Promise<Response | null> {
  const path = url.pathname;
  const segments = path.split("/").filter(Boolean); // ["api", "links", ":id"]
  const resource = segments[1]; // "links" | "categories" | ...
  const resourceId = segments[2]; // id o undefined

  // ── /api/auth/session ──
  if (path === "/api/auth/session") {
    return jsonResponse({ authenticated: true, username: "demo" });
  }
  if (path === "/api/auth/logout") {
    return jsonResponse({ success: true });
  }
  if (path === "/api/auth/login") {
    return jsonResponse({ success: true });
  }

  // ── /api/settings ──
  if (resource === "settings") {
    if (method === "GET") return jsonResponse(demoSettings.get());
    if (method === "PUT" || method === "PATCH")
      return jsonResponse(demoSettings.update(body as Record<string, unknown>));
  }

  // ── /api/links ──
  if (resource === "links" && !resourceId) {
    if (method === "GET") {
      const params = Object.fromEntries(url.searchParams);
      return jsonResponse(demoLinks.list(params));
    }
    if (method === "POST") {
      const link = demoLinks.create(body as Record<string, unknown>);
      return jsonResponse(link, 201);
    }
    if (method === "DELETE") {
      // DELETE /api/links?id=xxx (query param pattern)
      const qid = url.searchParams.get("id");
      if (qid) { demoLinks.delete(qid); return jsonResponse({ success: true }); }
    }
    if (method === "PUT" || method === "PATCH") {
      // PATCH /api/links con body { id, ...fields }
      const bid = (body as Record<string, unknown>)?.id as string | undefined;
      if (bid) {
        const updated = demoLinks.update(bid, body as Record<string, unknown>);
        return updated ? jsonResponse(updated) : jsonResponse({ error: "Not found" }, 404);
      }
    }
  }
  if (resource === "links" && resourceId) {
    if (method === "GET") {
      const link = demoLinks.get(resourceId);
      return link ? jsonResponse(link) : jsonResponse({ error: "Not found" }, 404);
    }
    if (method === "PUT" || method === "PATCH") {
      const updated = demoLinks.update(resourceId, body as Record<string, unknown>);
      return updated ? jsonResponse(updated) : jsonResponse({ error: "Not found" }, 404);
    }
    if (method === "DELETE") {
      demoLinks.delete(resourceId);
      return jsonResponse({ success: true });
    }
  }

  // ── /api/categories ──
  if (resource === "categories" && !resourceId) {
    if (method === "GET") return jsonResponse(demoCategories.list());
    if (method === "POST") return jsonResponse(demoCategories.create(body as Record<string, unknown>), 201);
    if (method === "DELETE") {
      // DELETE /api/categories?id=xxx (query param pattern)
      const qid = url.searchParams.get("id");
      if (qid) { demoCategories.delete(qid); return jsonResponse({ success: true }); }
    }
    if (method === "PUT" || method === "PATCH") {
      // PATCH /api/categories con body { id, ...fields }
      const bid = (body as Record<string, unknown>)?.id as string | undefined;
      if (bid) {
        const updated = demoCategories.update(bid, body as Record<string, unknown>);
        return updated ? jsonResponse(updated) : jsonResponse({ error: "Not found" }, 404);
      }
    }
  }
  if (resource === "categories" && resourceId) {
    if (method === "PUT" || method === "PATCH") {
      const updated = demoCategories.update(resourceId, body as Record<string, unknown>);
      return updated ? jsonResponse(updated) : jsonResponse({ error: "Not found" }, 404);
    }
    if (method === "DELETE") {
      demoCategories.delete(resourceId);
      return jsonResponse({ success: true });
    }
  }

  // ── /api/tags ──
  if (resource === "tags" && !resourceId) {
    if (method === "GET") return jsonResponse(demoTags.list());
    if (method === "POST") return jsonResponse(demoTags.create(body as Record<string, unknown>), 201);
    if (method === "DELETE") {
      // DELETE /api/tags?id=xxx (query param pattern)
      const qid = url.searchParams.get("id");
      if (qid) { demoTags.delete(qid); return jsonResponse({ success: true }); }
    }
    if (method === "PUT" || method === "PATCH") {
      // PUT /api/tags con body { id, ...fields }
      const bid = (body as Record<string, unknown>)?.id as string | undefined;
      if (bid) {
        const updated = demoTags.update(bid, body as Record<string, unknown>);
        return updated ? jsonResponse(updated) : jsonResponse({ error: "Not found" }, 404);
      }
    }
  }
  if (resource === "tags" && resourceId) {
    if (method === "PUT" || method === "PATCH") {
      const updated = demoTags.update(resourceId, body as Record<string, unknown>);
      return updated ? jsonResponse(updated) : jsonResponse({ error: "Not found" }, 404);
    }
    if (method === "DELETE") {
      demoTags.delete(resourceId);
      return jsonResponse({ success: true });
    }
  }

  // ── /api/link-tags ──
  if (resource === "link-tags") {
    if (method === "GET") {
      const linkId = url.searchParams.get("linkId");
      return jsonResponse(linkId ? demoLinkTags.forLink(linkId) : demoLinkTags.list());
    }
    if (method === "POST") {
      const { linkId, tagId, tagIds } = body as { linkId?: string; tagId?: string; tagIds?: string[] };
      if (linkId && tagIds) {
        demoLinkTags.setForLink(linkId, tagIds);
        return jsonResponse({ success: true });
      }
      if (linkId && tagId) {
        demoLinkTags.add(linkId, tagId);
        return jsonResponse({ success: true });
      }
      return jsonResponse({ error: "Bad request" }, 400);
    }
    if (method === "DELETE") {
      const { linkId, tagId } = body as { linkId?: string; tagId?: string };
      if (linkId && tagId) {
        demoLinkTags.remove(linkId, tagId);
        return jsonResponse({ success: true });
      }
      return jsonResponse({ error: "Bad request" }, 400);
    }
  }

  // ── /api/widgets ──
  if (resource === "widgets" && !resourceId) {
    if (method === "GET") return jsonResponse(demoWidgets.list());
    if (method === "POST") return jsonResponse(demoWidgets.create(body as Record<string, unknown>), 201);
    if (method === "DELETE") {
      // DELETE /api/widgets?id=xxx (query param pattern)
      const qid = url.searchParams.get("id");
      if (qid) { demoWidgets.delete(qid); return jsonResponse({ success: true }); }
    }
    if (method === "PUT" || method === "PATCH") {
      // PATCH /api/widgets con body { id, ...fields }
      const bid = (body as Record<string, unknown>)?.id as string | undefined;
      if (bid) {
        const updated = demoWidgets.update(bid, body as Record<string, unknown>);
        return updated ? jsonResponse(updated) : jsonResponse({ error: "Not found" }, 404);
      }
    }
  }
  if (resource === "widgets" && resourceId) {
    // /api/widgets/layouts (especial)
    if (resourceId === "layouts") {
      if (method === "POST" || method === "PUT" || method === "PATCH") {
        const { layouts } = body as { layouts?: Array<{ i?: string; id?: string; x: number; y: number; w: number; h: number }> };
        if (layouts) {
          // react-grid-layout usa 'i' como ID del widget, pero updateLayouts espera 'id'
          const normalized = layouts.map(l => ({ ...l, id: l.id ?? l.i ?? "" }));
          demoWidgets.updateLayouts(normalized);
        }
        return jsonResponse({ success: true });
      }
    }
    if (method === "GET") {
      const all = demoWidgets.list();
      const w = all.find((ww) => ww.id === resourceId);
      return w ? jsonResponse(w) : jsonResponse({ error: "Not found" }, 404);
    }
    if (method === "PUT" || method === "PATCH") {
      const updated = demoWidgets.update(resourceId, body as Record<string, unknown>);
      return updated ? jsonResponse(updated) : jsonResponse({ error: "Not found" }, 404);
    }
    if (method === "DELETE") {
      demoWidgets.delete(resourceId);
      return jsonResponse({ success: true });
    }
  }

  // ── /api/projects ──
  if (resource === "projects" && !resourceId) {
    if (method === "GET") return jsonResponse(demoProjects.list());
    if (method === "POST") return jsonResponse(demoProjects.create(body as Record<string, unknown>), 201);
    if (method === "DELETE") {
      // DELETE /api/projects?id=xxx (query param pattern)
      const qid = url.searchParams.get("id");
      if (qid) { demoProjects.delete(qid); return jsonResponse({ success: true }); }
    }
  }
  if (resource === "projects" && resourceId) {
    if (method === "PUT" || method === "PATCH") {
      const updated = demoProjects.update(resourceId, body as Record<string, unknown>);
      return updated ? jsonResponse(updated) : jsonResponse({ error: "Not found" }, 404);
    }
    if (method === "DELETE") {
      demoProjects.delete(resourceId);
      return jsonResponse({ success: true });
    }
  }

  // ── /api/stickers ── devolver pegatinas reales del directorio /public/stickers
  if (resource === "stickers") {
    if (method === "GET") {
      const DEMO_STICKER_FILES = [
        "Sprite-0001.png","Sprite-0002.png","Sprite-0003.png","Sprite-0004.png",
        "Sprite-00202.png","Sprite-00205.png","Sprite-00307.png","Sprite-01001.png",
        "Sprite-02006.png","Sprite-03008.png","Sprite-04009.png","Sprite-3004.png",
        "generated_1765206385932_upscayl_2x_digital-art-4x_sprite_01.png",
        "generated_1765206385932_upscayl_2x_digital-art-4x_sprite_02.png",
        "generated_1765206385932_upscayl_2x_digital-art-4x_sprite_03.png",
        "generated_1765206385932_upscayl_2x_digital-art-4x_sprite_04.png",
        "generated_1765206385932_upscayl_2x_digital-art-4x_sprite_05.png",
        "generated_1765206385932_upscayl_2x_digital-art-4x_sprite_06.png",
        "generated_1765206385932_upscayl_2x_digital-art-4x_sprite_07.png",
        "generated_1765206385932_upscayl_2x_digital-art-4x_sprite_08.png",
        "generated_1765206385932_upscayl_2x_digital-art-4x_sprite_09.png",
        "generated_1765206421947_upscayl_2x_digital-art-4x_sprite_01.png",
        "generated_1765206421947_upscayl_2x_digital-art-4x_sprite_02.png",
        "generated_1765206421947_upscayl_2x_digital-art-4x_sprite_03.png",
        "generated_1765206421947_upscayl_2x_digital-art-4x_sprite_04.png",
        "generated_1765206421947_upscayl_2x_digital-art-4x_sprite_05.png",
        "generated_1765206421947_upscayl_2x_digital-art-4x_sprite_06.png",
        "generated_1765206421947_upscayl_2x_digital-art-4x_sprite_07.png",
        "generated_1765206421947_upscayl_2x_digital-art-4x_sprite_08.png",
        "generated_1765206421947_upscayl_2x_digital-art-4x_sprite_09.png",
        "generated_1765206421947_upscayl_2x_digital-art-4x_sprite_10.png",
        "generated_1765206421947_upscayl_2x_digital-art-4x_sprite_11.png",
        "generated_1765206421947_upscayl_2x_digital-art-4x_sprite_12.png",
        "generated_1765206621272_upscayl_2x_digital-art-4x_sprite_01.png",
        "generated_1765206621272_upscayl_2x_digital-art-4x_sprite_02.png",
        "generated_1765206621272_upscayl_2x_digital-art-4x_sprite_03.png",
        "generated_1765206621272_upscayl_2x_digital-art-4x_sprite_04.png",
        "generated_1765206621272_upscayl_2x_digital-art-4x_sprite_05.png",
        "generated_1765206621272_upscayl_2x_digital-art-4x_sprite_06.png",
        "generated_1765206621272_upscayl_2x_digital-art-4x_sprite_07.png",
        "generated_1765206621272_upscayl_2x_digital-art-4x_sprite_08.png",
        "generated_1765206621272_upscayl_2x_digital-art-4x_sprite_09.png",
        "generated_1765206866928_upscayl_2x_digital-art-4x_sprite_01.png",
        "generated_1765206866928_upscayl_2x_digital-art-4x_sprite_02.png",
        "generated_1765206866928_upscayl_2x_digital-art-4x_sprite_03.png",
        "generated_1765206866928_upscayl_2x_digital-art-4x_sprite_04.png",
        "generated_1765206866928_upscayl_2x_digital-art-4x_sprite_05.png",
        "generated_1765206866928_upscayl_2x_digital-art-4x_sprite_06.png",
      ];
      const stickers = DEMO_STICKER_FILES.map((filename, index) => ({
        id: `sticker-${index}-${filename}`,
        filename,
        path: `/stickers/${filename}`,
        name: filename.replace(/\.png$/i, "").replace(/_/g, " "),
        category: "other",
      }));
      return jsonResponse(stickers);
    }
    return jsonResponse({ success: true });
  }

  // ── /api/nintendo-deals ── (no disponible en demo — evita 503 de la API externa)
  if (resource === "nintendo-deals") {
    return jsonResponse({
      games: [],
      totalCount: 0,
      hasMore: false,
      error: "Nintendo eShop no disponible en modo demo",
    });
  }

  // ── /api/classification-rules ──
  if (resource === "classification-rules") {
    if (!resourceId) {
      if (method === "GET") return jsonResponse(demoClassificationRules.list());
      if (method === "POST") return jsonResponse(demoClassificationRules.create(body as Record<string, unknown>), 201);
      if (method === "DELETE") {
        demoClassificationRules.deleteAll();
        return jsonResponse({ success: true });
      }
    }
    if (resourceId) {
      if (method === "PUT" || method === "PATCH") {
        const updated = demoClassificationRules.update(resourceId, body as Record<string, unknown>);
        return updated ? jsonResponse(updated) : jsonResponse({ error: "Not found" }, 404);
      }
      if (method === "DELETE") {
        demoClassificationRules.delete(resourceId);
        return jsonResponse({ success: true });
      }
    }
  }

  // ── /api/link-sessions ──
  if (resource === "link-sessions") {
    if (!resourceId) {
      if (method === "GET") return jsonResponse(demoLinkSessions.list());
      if (method === "POST") return jsonResponse(demoLinkSessions.create(body as Record<string, unknown>), 201);
    }
    if (resourceId) {
      // /api/link-sessions/[id]/launch
      const subAction = segments[3]; // "launch" o undefined
      if (subAction === "launch" && method === "POST") {
        const session = demoLinkSessions.get(resourceId);
        if (!session) return jsonResponse({ error: "Not found" }, 404);
        return jsonResponse({ success: true, linkIds: session.linkIds });
      }
      if (method === "GET") {
        const session = demoLinkSessions.get(resourceId);
        return session ? jsonResponse(session) : jsonResponse({ error: "Not found" }, 404);
      }
      if (method === "PUT" || method === "PATCH") {
        const updated = demoLinkSessions.update(resourceId, body as Record<string, unknown>);
        return updated ? jsonResponse(updated) : jsonResponse({ error: "Not found" }, 404);
      }
      if (method === "DELETE") {
        demoLinkSessions.remove(resourceId);
        return jsonResponse({ success: true });
      }
    }
  }

  // ── /api/archives ──
  if (resource === "archives") {
    if (!resourceId) {
      if (method === "GET") {
        const linkId = url.searchParams.get("linkId") ?? undefined;
        return jsonResponse(demoPageArchives.list(linkId));
      }
      if (method === "POST") {
        const b = body as Record<string, unknown>;
        const linkId = b.linkId as string;
        const allLinks = demoLinks.list({});
        const linkRecord = Array.isArray(allLinks)
          ? (allLinks as unknown as Array<Record<string, unknown>>).find((l) => l.id === linkId)
          : null;
        const linkTitle = (linkRecord?.title as string) ?? "Página archivada";
        const demoText = [
          `Esta es una vista previa del modo lectura para "${linkTitle}".`,
          ``,
          `El modo lectura de Stacklume extrae el contenido principal de una página web y lo presenta en un formato limpio y sin distracciones. Se eliminan automáticamente los anuncios, menús de navegación y otros elementos visuales secundarios para que puedas concentrarte en lo que importa: el contenido.`,
          ``,
          `Esta funcionalidad es especialmente útil para artículos largos, entradas de blog o cualquier contenido que quieras leer con detenimiento. El texto archivado se guarda localmente en tu dispositivo y está disponible incluso cuando no tienes conexión a internet.`,
          ``,
          `Puedes guardar múltiples versiones del mismo artículo a lo largo del tiempo para comparar cambios, o simplemente tener siempre disponible una copia de referencia de los recursos que más utilizas en tu día a día.`,
          ``,
          `El sistema de archivado también registra la fecha en que se guardó el contenido, el número de palabras y el tiempo estimado de lectura, para que puedas organizar mejor tu cola de lectura.`,
          ``,
          `En la versión completa de Stacklume (fuera del modo demo), esta función descarga el contenido real de la URL indicada y lo procesa de forma inteligente para ofrecerte la mejor experiencia de lectura posible.`,
        ].join("\n");
        const wordCount = demoText.split(/\s+/).filter(Boolean).length;
        const archive = demoPageArchives.create({
          linkId,
          title: linkTitle,
          textContent: demoText,
          wordCount,
          size: demoText.length,
        });
        return jsonResponse(archive, 201);
      }
    }
    if (resourceId) {
      if (method === "GET") {
        const archive = demoPageArchives.get(resourceId);
        return archive ? jsonResponse(archive) : jsonResponse({ error: "Not found" }, 404);
      }
      if (method === "DELETE") {
        demoPageArchives.remove(resourceId);
        return jsonResponse({ success: true });
      }
    }
  }

  // ── /api/links/[id]/reading-status ──
  if (resource === "links" && resourceId && segments[3] === "reading-status") {
    if (method === "PUT" || method === "PATCH") {
      const b = body as Record<string, unknown>;
      const updated = demoLinks.update(resourceId, {
        readingStatus: b.readingStatus as string | undefined,
        reviewAt: b.reviewAt as string | undefined,
      } as Parameters<typeof demoLinks.update>[1]);
      return updated ? jsonResponse(updated) : jsonResponse({ error: "Not found" }, 404);
    }
  }

  // ── /api/saved-searches ──
  if (resource === "saved-searches") {
    const STORAGE_KEY = "stacklume-demo-saved-searches";
    const getAll = (): Array<Record<string, unknown>> => {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
      } catch { return []; }
    };
    const saveAll = (items: Array<Record<string, unknown>>) => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    };

    if (method === "GET") return jsonResponse(getAll());
    if (method === "POST") {
      const b = body as Record<string, unknown>;
      const item = {
        id: crypto.randomUUID(),
        userId: "default",
        name: b.name ?? "",
        query: b.query ?? "",
        filters: b.filters ?? null,
        createdAt: new Date().toISOString(),
      };
      const all = getAll();
      all.push(item);
      saveAll(all);
      return jsonResponse(item, 201);
    }
    if (method === "DELETE") {
      const id = url.searchParams.get("id");
      if (id) {
        const all = getAll().filter((s) => s.id !== id);
        saveAll(all);
      }
      return jsonResponse({ success: true });
    }
  }

  // ── /api/backups ── (no disponible en demo)
  if (resource === "backups") {
    if (method === "GET") return jsonResponse([]);
    return jsonResponse({ error: "Backups no disponibles en modo demo" }, 501);
  }

  // Ruta no reconocida: dejar pasar al servidor
  return null;
}

// ─── Instalación del interceptor ─────────────────────────────────────────────

let interceptorInstalled = false;

export function installDemoInterceptor(): void {
  if (interceptorInstalled || typeof window === "undefined") return;
  interceptorInstalled = true;

  const originalFetch = window.fetch.bind(window);

  window.fetch = async function demoFetch(
    input: RequestInfo | URL,
    init?: RequestInit
  ): Promise<Response> {
    let urlString: string;
    if (typeof input === "string") {
      urlString = input;
    } else if (input instanceof URL) {
      urlString = input.href;
    } else {
      urlString = input.url;
    }

    // Normalizar la URL
    let url: URL;
    try {
      url = new URL(urlString, window.location.origin);
    } catch {
      return originalFetch(input, init);
    }

    // Solo interceptar rutas /api/ del mismo origen
    const isSameOrigin = url.origin === window.location.origin;
    const isApiRoute = url.pathname.startsWith("/api/");

    if (!isSameOrigin || !isApiRoute || shouldPassthrough(url.pathname)) {
      return originalFetch(input, init);
    }

    const method = (init?.method ?? "GET").toUpperCase();

    // Parsear body si existe
    let body: unknown = undefined;
    if (init?.body) {
      try {
        body =
          typeof init.body === "string"
            ? JSON.parse(init.body)
            : init.body;
      } catch {
        body = init.body;
      }
    }

    try {
      const response = await handleDemoRequest(url, method, body);
      if (response !== null) return response;
    } catch (err) {
      console.error("[Demo] Error handling request", url.pathname, err);
      return jsonResponse({ error: "Demo mode error" }, 500);
    }

    // Ruta no manejada: pasar al servidor
    return originalFetch(input, init);
  };
}
