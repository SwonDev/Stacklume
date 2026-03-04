/**
 * Endpoint MCP (Model Context Protocol) para Stacklume.
 *
 * Implementa JSON-RPC 2.0 sobre HTTP (Streamable HTTP transport) sin SDK externo.
 * Autenticación: Bearer token comparado con userSettings.mcpApiKey.
 *
 * Métodos soportados:
 *   initialize     → protocolo/capacidades del servidor
 *   tools/list     → definiciones de las 23 herramientas
 *   tools/call     → llamada a una herramienta específica
 *   ping           → keepalive
 */

import { NextRequest, NextResponse } from "next/server";
import { db, withRetry } from "@/lib/db";
import { userSettings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { callTool } from "@/lib/mcp/tools";
import { createModuleLogger } from "@/lib/logger";

const log = createModuleLogger("api/mcp");

// ─── Comparación de tokens en tiempo constante ────────────────────────────────

function safeTokenEqual(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b || a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

// ─── Definiciones de herramientas (JSON Schema) ───────────────────────────────

const TOOL_DEFINITIONS = [
  {
    name: "get_app_info",
    description: "Obtiene información general de Stacklume: estadísticas de widgets, enlaces, categorías y proyectos.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "list_widget_types",
    description: "Lista todos los tipos de widget built-in disponibles (190+) con su descripción, tamaño y schema de configuración.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "get_widget_type_schema",
    description: "Obtiene el schema de configuración detallado de un tipo de widget específico.",
    inputSchema: {
      type: "object",
      properties: {
        type: { type: "string", description: "Tipo de widget (p.ej. 'clock', 'notes', 'github-trending')" },
      },
      required: ["type"],
    },
  },
  {
    name: "list_widgets",
    description: "Lista todas las instancias de widget en el dashboard.",
    inputSchema: {
      type: "object",
      properties: {
        projectId: { type: "string", description: "Filtrar por proyecto (opcional; omitir para todos)" },
      },
    },
  },
  {
    name: "add_widget",
    description: "Añade un widget built-in al dashboard. Usa list_widget_types para ver los tipos disponibles. IMPORTANTE: después de añadir, informa al usuario que debe refrescar la página (F5) para ver el nuevo widget.",
    inputSchema: {
      type: "object",
      properties: {
        type: { type: "string", description: "Tipo de widget (p.ej. 'notes', 'clock', 'github-trending')" },
        title: { type: "string", description: "Título personalizado (opcional)" },
        size: { type: "string", enum: ["small", "medium", "large", "wide", "tall"], description: "Tamaño del widget (por defecto: medium)" },
        config: { type: "object", description: "Configuración específica del tipo (ver get_widget_type_schema)" },
        projectId: { type: "string", description: "ID del proyecto donde añadir el widget (null = Home)" },
      },
      required: ["type"],
    },
  },
  {
    name: "update_widget",
    description: "Actualiza el título, tamaño o configuración de un widget existente.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "ID del widget a actualizar" },
        title: { type: "string", description: "Nuevo título (opcional)" },
        size: { type: "string", enum: ["small", "medium", "large", "wide", "tall"], description: "Nuevo tamaño (opcional)" },
        config: { type: "object", description: "Nueva configuración (opcional; reemplaza la existente)" },
      },
      required: ["id"],
    },
  },
  {
    name: "remove_widget",
    description: "Elimina un widget del dashboard (borrado lógico).",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "ID del widget a eliminar" },
      },
      required: ["id"],
    },
  },
  {
    name: "list_custom_widget_types",
    description: "Lista los tipos de widget personalizados creados por el usuario o la IA.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "create_custom_widget_type",
    description: "Crea un tipo de widget personalizado con HTML/CSS/JS inline. El template se renderiza en <iframe sandbox='allow-scripts'> (sin red ni recursos externos). Reglas: (1) usa {{CONFIG_JSON}} para acceder a la config (se sustituye por JSON), (2) para canvas usa ResizeObserver para ajustar width/height al contenedor, (3) NO usar fetch/XHR/CDN/import, todo inline. Después de crear, usa add_custom_widget para colocarlo y pide al usuario que refresque.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Nombre del tipo de widget" },
        description: { type: "string", description: "Descripción breve" },
        htmlTemplate: { type: "string", description: "HTML completo con <style> y <script> inline. Usa {{CONFIG_JSON}} para la config. Para canvas: const ro = new ResizeObserver(([e]) => { canvas.width = e.contentRect.width; canvas.height = e.contentRect.height; draw(); }); ro.observe(canvas);" },
        category: { type: "string", description: "Categoría (por defecto: 'custom')" },
        icon: { type: "string", description: "Nombre de icono Lucide (por defecto: 'Puzzle')" },
        configSchema: { type: "object", description: "Schema JSON de las propiedades de configuración del widget" },
        defaultConfig: { type: "object", description: "Valores de configuración por defecto" },
        defaultWidth: { type: "number", description: "Anchura por defecto en columnas de cuadrícula (1-12, por defecto: 2)" },
        defaultHeight: { type: "number", description: "Altura por defecto en filas de cuadrícula (1-12, por defecto: 2)" },
      },
      required: ["name", "htmlTemplate"],
    },
  },
  {
    name: "update_custom_widget_type",
    description: "Actualiza un tipo de widget personalizado existente.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "ID del tipo de widget personalizado" },
        name: { type: "string" },
        description: { type: "string" },
        htmlTemplate: { type: "string" },
        category: { type: "string" },
        icon: { type: "string" },
        configSchema: { type: "object" },
        defaultConfig: { type: "object" },
        defaultWidth: { type: "number" },
        defaultHeight: { type: "number" },
      },
      required: ["id"],
    },
  },
  {
    name: "delete_custom_widget_type",
    description: "Elimina un tipo de widget personalizado (borrado lógico).",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "ID del tipo de widget personalizado" },
      },
      required: ["id"],
    },
  },
  {
    name: "add_custom_widget",
    description: "Coloca una instancia de un tipo de widget personalizado en el dashboard. USA SIEMPRE este tool para widgets custom-user; NUNCA uses add_widget para esto. El parámetro customWidgetTypeId es el campo 'id' exacto devuelto por create_custom_widget_type o list_custom_widget_types. IMPORTANTE: tras añadir, pide al usuario que refresque la página (F5).",
    inputSchema: {
      type: "object",
      properties: {
        customWidgetTypeId: { type: "string", description: "El 'id' exacto del tipo personalizado — cópialo directamente del campo id de la respuesta de create_custom_widget_type o de list_custom_widget_types" },
        title: { type: "string", description: "Título de la instancia (opcional; por defecto: nombre del tipo)" },
        config: { type: "object", description: "Configuración inicial como objeto JSON (opcional). NO pasar como string." },
        projectId: { type: "string", description: "ID del proyecto (omitir o null = vista Home)" },
      },
      required: ["customWidgetTypeId"],
    },
  },
  {
    name: "export_custom_widget_type",
    description: "Exporta un tipo de widget personalizado como JSON (para compartir o importar en otras instancias).",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "ID del tipo de widget personalizado" },
      },
      required: ["id"],
    },
  },
  {
    name: "import_custom_widget_type",
    description: "Importa un tipo de widget personalizado desde JSON exportado (debe tener stacklume_widget_type: '1.0').",
    inputSchema: {
      type: "object",
      properties: {
        data: { type: "object", description: "Objeto JSON exportado con stacklume_widget_type: '1.0'" },
      },
      required: ["data"],
    },
  },
  {
    name: "list_links",
    description: "Lista los enlaces guardados en Stacklume.",
    inputSchema: {
      type: "object",
      properties: {
        limit: { type: "number", description: "Número máximo de resultados (por defecto: 50, máximo: 200)" },
      },
    },
  },
  {
    name: "add_link",
    description: "Añade un nuevo enlace a la colección.",
    inputSchema: {
      type: "object",
      properties: {
        url: { type: "string", description: "URL del enlace" },
        title: { type: "string", description: "Título del enlace" },
        description: { type: "string", description: "Descripción (opcional)" },
        categoryId: { type: "string", description: "ID de categoría (opcional)" },
        isFavorite: { type: "boolean", description: "Marcar como favorito (opcional)" },
      },
      required: ["url", "title"],
    },
  },
  {
    name: "update_link",
    description: "Actualiza los datos de un enlace existente.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "ID del enlace" },
        title: { type: "string" },
        description: { type: "string" },
        categoryId: { type: "string" },
        isFavorite: { type: "boolean" },
      },
      required: ["id"],
    },
  },
  {
    name: "delete_link",
    description: "Elimina un enlace (borrado lógico).",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "ID del enlace" },
      },
      required: ["id"],
    },
  },
  {
    name: "list_categories",
    description: "Lista todas las categorías de enlaces disponibles.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "list_tags",
    description: "Lista todas las etiquetas disponibles.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "list_projects",
    description: "Lista todos los proyectos/workspaces del dashboard.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "get_settings",
    description: "Obtiene la configuración actual de la aplicación (tema, modo de vista, densidad, etc.).",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "update_settings",
    description: "Actualiza la configuración de la aplicación.",
    inputSchema: {
      type: "object",
      properties: {
        theme: { type: "string", enum: ["light", "dark", "system"], description: "Tema visual" },
        viewDensity: { type: "string", enum: ["compact", "normal", "comfortable"], description: "Densidad de vista" },
        viewMode: { type: "string", enum: ["bento", "kanban", "list"], description: "Modo de vista" },
        showTooltips: { type: "boolean", description: "Mostrar tooltips" },
        reduceMotion: { type: "boolean", description: "Reducir animaciones" },
      },
    },
  },
];

// ─── Cabeceras de respuesta ────────────────────────────────────────────────────

function mcpHeaders() {
  return {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}

function jsonRpcOk(id: unknown, result: unknown): NextResponse {
  return NextResponse.json(
    { jsonrpc: "2.0", id, result },
    { headers: mcpHeaders() }
  );
}

function jsonRpcError(id: unknown, code: number, message: string): NextResponse {
  return NextResponse.json(
    { jsonrpc: "2.0", id, error: { code, message } },
    { status: code >= -32099 && code <= -32000 ? 500 : 200, headers: mcpHeaders() }
  );
}

// ─── Preflight CORS ───────────────────────────────────────────────────────────

export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(null, { status: 204, headers: mcpHeaders() });
}

// ─── Endpoint principal ───────────────────────────────────────────────────────

export async function POST(request: NextRequest): Promise<NextResponse> {
  // 1. Autenticación — Bearer token
  const authHeader = request.headers.get("Authorization");
  const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  const [settings] = await withRetry(
    () => db.select().from(userSettings).where(eq(userSettings.userId, "default")),
    { operationName: "mcp auth check" }
  ).catch(() => [null]);

  if (!settings?.mcpEnabled) {
    return NextResponse.json(
      { error: "El servidor MCP está desactivado. Actívalo en Configuración → Servidor MCP." },
      { status: 503, headers: mcpHeaders() }
    );
  }

  if (!safeTokenEqual(bearerToken, settings.mcpApiKey)) {
    log.warn("MCP: intento de acceso con token inválido");
    return NextResponse.json(
      { error: "Token de autenticación inválido o ausente" },
      { status: 401, headers: mcpHeaders() }
    );
  }

  // 2. Parse JSON-RPC
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonRpcError(null, -32700, "Parse error");
  }

  if (!body || typeof body !== "object") {
    return jsonRpcError(null, -32600, "Invalid request");
  }

  const rpc = body as Record<string, unknown>;
  const id = rpc.id ?? null;
  const method = rpc.method as string | undefined;
  const params = (rpc.params as Record<string, unknown>) || {};

  if (!method) {
    return jsonRpcError(id, -32600, "Missing method");
  }

  log.info({ method }, "MCP tool call");

  // 3. Dispatch
  try {
    switch (method) {
      case "initialize":
        return jsonRpcOk(id, {
          protocolVersion: "2024-11-05",
          capabilities: { tools: {} },
          serverInfo: { name: "stacklume", version: "1.0.0" },
          instructions: `Servidor MCP de Stacklume — dashboard de enlaces y widgets con bento grid (cuadrícula de 12 columnas).

FLUJO DE TRABAJO BÁSICO:
1. get_app_info → resumen del estado actual
2. list_widget_types → catálogo de 190+ tipos de widget built-in
3. add_widget con el tipo elegido → añade widget al dashboard
4. Para widgets HTML/CSS/JS propios: create_custom_widget_type → add_custom_widget

⚠️  IMPORTANTE — REFRESCO DE UI OBLIGATORIO:
El dashboard carga los widgets en memoria al arrancar y NO detecta cambios externos automáticamente. Después de CUALQUIER operación de widget (add_widget, update_widget, remove_widget, add_custom_widget), el usuario DEBE refrescar la página manualmente (F5 / Ctrl+R / Cmd+R) para que los cambios sean visibles. SIEMPRE informa de esto al usuario tras cada operación de widget.

COLORES DE MARCA STACKLUME — OBLIGATORIO por defecto (salvo que el usuario pida otra cosa):
• Fondo:        #0d1117  (navy black)
• Texto:        #e6edf3  (off-white)
• Acento gold:  #d4a520  (dorado) — usar en títulos, bordes de sección, highlights, SVG strokes
• Navy oscuro:  #1a2332
• Navy medio:   #243447  (ideal para tarjetas internas, paneles secundarios)
• Scrollbars dorados (incluir SIEMPRE en widgets con overflow): ::-webkit-scrollbar{width:6px;height:6px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:#d4a520;border-radius:3px}::-webkit-scrollbar-thumb:hover{background:#e6b822}

GUÍA COMPLETA PARA WIDGETS HTML PERSONALIZADOS (create_custom_widget_type):
• El template se renderiza dentro de un <iframe sandbox="allow-scripts"> — SIN acceso a red, localStorage, cookies ni DOM del padre.
• PROHIBIDO: fetch(), XMLHttpRequest, import(), WebSocket, recursos externos (CDN, imágenes remotas). TODO debe estar inline.
• ACCESO A CONFIG: Escribe el literal {{CONFIG_JSON}} en el template — se sustituye por JSON.stringify(config) al renderizar. Uso: const CONFIG = {{CONFIG_JSON}};
• CANVAS: Usa ResizeObserver para ajustar canvas.width/height al contenedor (sin esto el canvas queda en 0×0).

PLANTILLA CANVAS (copiar y adaptar):
<!DOCTYPE html><html><head><style>*{margin:0;padding:0;box-sizing:border-box}body{background:#0d1117;color:#e6edf3;font-family:system-ui,sans-serif;width:100%;height:100vh;overflow:hidden}canvas{display:block;width:100%;height:100%}</style></head><body><canvas id="c"></canvas><script>
const CONFIG = {{CONFIG_JSON}};
const canvas = document.getElementById('c'), ctx = canvas.getContext('2d');
const ro = new ResizeObserver(([e]) => { canvas.width = e.contentRect.width; canvas.height = e.contentRect.height; draw(); });
ro.observe(canvas);
function draw() { /* tu lógica aquí — usa #d4a520 para líneas/textos destacados */ }
</script></body></html>

PLANTILLA HTML/CSS (copiar y adaptar):
<!DOCTYPE html><html><head><meta charset="utf-8"><style>*{margin:0;padding:0;box-sizing:border-box}::-webkit-scrollbar{width:6px;height:6px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:#d4a520;border-radius:3px}body{background:#0d1117;color:#e6edf3;font-family:system-ui,sans-serif;padding:12px;height:100vh;overflow:auto}.accent{color:#d4a520}.card{background:#1a2332;border:1px solid #243447;border-radius:8px;padding:12px}</style></head><body><div id="app"></div><script>const CONFIG = {{CONFIG_JSON}}; /* tu lógica aquí */</script></body></html>

TAMAÑOS: small=1×1, medium=2×2, large=4×3, wide=4×2, tall=2×3. Usa defaultWidth/defaultHeight para dimensiones exactas en la cuadrícula de 12 columnas.`,
        });

      case "tools/list":
        return jsonRpcOk(id, { tools: TOOL_DEFINITIONS });

      case "tools/call": {
        const toolName = params.name as string;
        const toolArgs = (params.arguments as Record<string, unknown>) || {};
        const result = await callTool(toolName, toolArgs);
        return jsonRpcOk(id, result);
      }

      case "ping":
        return jsonRpcOk(id, {});

      default:
        return jsonRpcError(id, -32601, `Method not found: ${method}`);
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    log.error({ error, method }, "MCP handler error");
    return jsonRpcError(id, -32603, `Internal error: ${msg}`);
  }
}
