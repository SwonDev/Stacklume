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

// ─── CORS origin check ───────────────────────────────────────────────────────

function getMcpCorsOrigin(request?: Request): string {
  const origin = request?.headers.get("origin");
  // In desktop mode, allow localhost origins
  if (process.env.DESKTOP_MODE === "true") {
    if (!origin || /^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(origin)) {
      return origin || "http://127.0.0.1";
    }
  }
  // MCP clients (Claude Desktop, Cursor) don't send Origin header
  // For web, don't allow cross-origin at all — MCP is server-to-server
  if (!origin) return "null";
  return "null"; // Block cross-origin browser requests
}

// ─── Cabeceras de respuesta ────────────────────────────────────────────────────

function mcpHeaders(request?: Request) {
  return {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": getMcpCorsOrigin(request),
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}

function jsonRpcOk(id: unknown, result: unknown, request?: Request): NextResponse {
  return NextResponse.json(
    { jsonrpc: "2.0", id, result },
    { headers: mcpHeaders(request) }
  );
}

function jsonRpcError(id: unknown, code: number, message: string, request?: Request): NextResponse {
  return NextResponse.json(
    { jsonrpc: "2.0", id, error: { code, message } },
    { status: code >= -32099 && code <= -32000 ? 500 : 200, headers: mcpHeaders(request) }
  );
}

// ─── Preflight CORS ───────────────────────────────────────────────────────────

export async function OPTIONS(request: NextRequest): Promise<NextResponse> {
  return new NextResponse(null, { status: 204, headers: mcpHeaders(request) });
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
          serverInfo: { name: "stacklume", version: "2.0.0" },
          instructions: `═══════════════════════════════════════════════════
STACKLUME MCP — GUÍA COMPLETA DEL SERVIDOR v2.0
═══════════════════════════════════════════════════

STACKLUME es un dashboard personal de gestión de enlaces y widgets con bento grid.

────────────────────────────────────────────────────
ARQUITECTURA DEL DASHBOARD
────────────────────────────────────────────────────
• Bento grid de 12 columnas, filas de ~80px
• Widget = { type, title, config (JSON), layout {x,y,w,h}, projectId }
• Proyectos = workspaces independientes (projectId null = Home)
• Vistas: bento (drag&drop), kanban (columnas), list

TAMAÑOS DE WIDGET (presets reales del código):
  small  = 1×1 col  | medium = 2×2  | large  = 4×3
  wide   = 4×2      | tall   = 2×3
  → Usa defaultWidth/defaultHeight para dimensiones exactas (grid de 12 cols)
  → Ejemplos: widget de 6×4 ocupa media pantalla; 12×6 ocupa toda la anchura
  → Recomendación: custom widgets usar mínimo 3×3 para tener espacio suficiente

────────────────────────────────────────────────────
TIPOS DE WIDGET
────────────────────────────────────────────────────
A) BUILT-IN (190+ tipos): widgets preconstruidos con su propia UI React.
   Flujo: add_widget(type, title, size, config?)
   Datos configurables vía config JSON — usa get_widget_type_schema(type) para ver campos.
   Ejemplos de tipos:
     Links:        favorites, recent, category, tag, quick-add, link-manager
     Productiv.:   notes, todo, pomodoro, calendar, countdown, habit-tracker
     Dev tools:    github-trending, github-search, mcp-explorer, deployment-status
     Media:        youtube, spotify, embed, image, unsplash
     Utilidades:   clock, weather, calculator, qr-code, color-palette, quote
     Texto/Código: json-formatter, markdown-preview, regex-tester, jwt-decoder
     Juegos:       sprite-sheet, pathfinding, pixel-art, physics-playground, particle-system
     CSS gen.:     gradient-generator, glassmorphism, box-shadow-generator, css-animation
     Org./Dev.:    code-snippets, api-reference, env-vars, git-commands, pr-checklist

B) CUSTOM-USER (widgets HTML/CSS/JS personalizados):
   Flujo: create_custom_widget_type(name, htmlTemplate, ...) → add_custom_widget(customWidgetTypeId)
   El tipo define el template; cada instancia tiene su propia config.
   Los datos de instancia se pasan como {{CONFIG_JSON}} al renderizar.

────────────────────────────────────────────────────
CICLO DE VIDA DE UN WIDGET PERSONALIZADO (custom-user)
────────────────────────────────────────────────────
1. create_custom_widget_type → crea el tipo (htmlTemplate + defaultConfig + schema)
2. add_custom_widget(customWidgetTypeId) → instancia en el dashboard
3. Al renderizar: se hace <iframe sandbox="allow-scripts" srcdoc={html}>
   donde {{CONFIG_JSON}} se sustituye por JSON.stringify(instanceConfig)
4. Para actualizar DATOS de una instancia específica desde la IA:
   list_widgets → localizar widget_id → update_widget({config: nuevaConfig})
5. Para actualizar el HTML/CSS/JS de TODAS las instancias de un tipo:
   update_custom_widget_type(id, {htmlTemplate: nuevoTemplate})

────────────────────────────────────────────────────
PERSISTENCIA TOTAL — LOS WIDGETS GUARDAN SUS PROPIOS DATOS
────────────────────────────────────────────────────
Los widgets custom-user tienen acceso a una API de persistencia bidireccional
a través de window.parent.postMessage. El iframe guarda directamente en la DB
de Stacklume sin intermediarios.

PROTOCOLO COMPLETO:

1. GUARDAR config (persiste en DB automáticamente):
function save(newConfig) {
  window.parent.postMessage({ type: 'stacklume:save', config: newConfig }, '*');
}
// Respuesta del parent:
window.addEventListener('message', e => {
  if (e.data?.type === 'stacklume:saved') {
    if (e.data.success) { /* mostrar "Guardado" */ }
    else { /* mostrar error */ }
  }
});

2. SOLICITAR config actual desde la DB:
window.parent.postMessage({ type: 'stacklume:get-config' }, '*');
window.addEventListener('message', e => {
  if (e.data?.type === 'stacklume:config') {
    const cfg = e.data.config; // config actual desde DB
  }
});

3. PATRON RECOMENDADO — Inicialización + Guardado:
const CONFIG = {{CONFIG_JSON}};
let state = JSON.parse(JSON.stringify(CONFIG)); // copia mutable

function saveState() {
  window.parent.postMessage({ type: 'stacklume:save', config: state }, '*');
}

window.addEventListener('message', e => {
  if (e.data?.type === 'stacklume:resize') { /* ajustar canvas */ }
  if (e.data?.type === 'stacklume:saved') { showSavedIndicator(e.data.success); }
});

REGLA ABSOLUTA:
→ TODOS los widgets interactivos DEBEN usar stacklume:save para persistir cambios
→ NUNCA decir al usuario que los datos se pierden — SE GUARDAN AUTOMATICAMENTE
→ NUNCA decir al usuario que "diga las URLs" — el widget tiene su propio formulario
→ El widget ES la aplicación completa; persiste sus propios datos sin la IA
→ Los datos SE GUARDAN AUTOMATICAMENTE: no hay estado efímero en un widget bien construido

────────────────────────────────────────────────────
GESTION DE DATOS EN WIDGETS — CRITICO
────────────────────────────────────────────────────
Los widgets con formularios guardan sus propios datos via stacklume:save.
La IA también puede modificar datos directamente usando el MCP:

PATRON CORRECTO para añadir/modificar datos desde la IA (ej: añadir item a una wishlist):
  1. list_widgets → encontrar el widget por título/tipo
  2. Leer config actual del widget (campo "config")
  3. Modificar config: añadir/editar/borrar items en config.items[]
  4. update_widget(widget_id, {config: configModificada})  ← SIEMPRE mantener _customTypeId
  5. Informar al usuario que debe refrescar (F5)

NUNCA decir al usuario "edita la config manualmente" — hazlo tú directamente.
Cuando el usuario pida añadir/quitar datos de cualquier widget, ejecuta update_widget sin pedir confirmación.

────────────────────────────────────────────────────
REFRESCO DE UI OBLIGATORIO
────────────────────────────────────────────────────
El dashboard carga widgets en memoria al iniciar y NO auto-detecta cambios externos.
Después de CUALQUIER add_widget / update_widget / remove_widget / add_custom_widget:
→ El usuario DEBE refrescar la página (F5 / Ctrl+R / Cmd+R) para ver los cambios.
→ SIEMPRE recuerda esto al usuario al final de cada operación de widget.
EXCEPCION: cambios hechos por el propio widget via stacklume:save NO requieren refresco.

────────────────────────────────────────────────────
COLORES DE MARCA STACKLUME — OBLIGATORIO por defecto
────────────────────────────────────────────────────
Usar siempre salvo que el usuario indique otra cosa:
  Fondo principal:  #0d1117  (navy black)
  Texto principal:  #e6edf3  (off-white)
  Acento dorado:    #d4a520  (usar en títulos, bordes destacados, SVG strokes, íconos)
  Acento gold 2:    #e6b822  (hover del dorado)
  Card oscura:      #111b27  (fondo de tarjetas internas)
  Navy oscuro:      #1a2332  (paneles secundarios)
  Navy medio:       #243447  (bordes, separadores)
  Texto secundario: #8b949e  (muted, placeholders)
  Verde éxito:      #3fb950
  Rojo error:       #ff6b6b

CSS SCROLLBARS DORADOS (incluir en TODO widget con overflow):
::-webkit-scrollbar{width:5px}::-webkit-scrollbar-track{background:transparent}
::-webkit-scrollbar-thumb{background:#d4a520;border-radius:3px}

────────────────────────────────────────────────────
GUIA HTML PARA WIDGETS PERSONALIZADOS — SANDBOX
────────────────────────────────────────────────────
Sandbox: <iframe sandbox="allow-scripts"> — SIN red, localStorage, cookies ni DOM padre.
PROHIBIDO: fetch(), XMLHttpRequest, import(), WebSocket, recursos externos (CDN).
TODO debe ser inline: CSS, JS, SVG, fuentes (base64 si necesario).

ACCESO A CONFIG: escribe el literal {{CONFIG_JSON}} en el template.
  Se sustituye por JSON.stringify(instanceConfig) al renderizar.
  Uso: const CONFIG = {{CONFIG_JSON}};
  Siempre proporciona fallbacks: const items = (CONFIG && CONFIG.items) || [];

REGLAS CRITICAS DE CSS:
  • body { height: 100%; overflow: hidden; } — el iframe toma el 100% del widget
  • Si hay scroll: overflow-y: auto en el contenedor + scrollbars dorados obligatorios
  • NUNCA usar position:fixed — el iframe ya es el viewport
  • NUNCA usar modales con position:fixed — usar position:absolute dentro del widget
  • Usar display:flex + flex-direction:column en body para layouts verticales

REGLAS CRITICAS DE JS:
  • Canvas: escucha SIEMPRE los dos canales de resize:
    1. ResizeObserver sobre el canvas/body (cambios de tamaño generales)
    2. window.addEventListener('message', e => { if(e.data?.type==='stacklume:resize') ... })
       → Stacklume envía este mensaje en tiempo real durante el drag de resize del widget
  • IDs únicos en el DOM — no usar id="app" si el widget puede instanciarse varias veces
  • Maneja undefined: const cfg = (typeof CONFIG !== 'undefined') ? CONFIG : {};
  • requestAnimationFrame funciona normalmente dentro del iframe

────────────────────────────────────────────────────
BIBLIOTECA DE COMPONENTES UI (CSS puro, sin CDN)
────────────────────────────────────────────────────

-- BOTONES --
.btn{display:inline-flex;align-items:center;gap:6px;padding:7px 14px;border-radius:7px;border:none;cursor:pointer;font-size:13px;font-weight:600;transition:all .15s}
.btn-primary{background:#d4a520;color:#0d1117}.btn-primary:hover{background:#e6b822;transform:translateY(-1px)}
.btn-ghost{background:transparent;color:#8b949e;border:1px solid #243447}.btn-ghost:hover{border-color:#d4a520;color:#d4a520}
.btn-danger{background:#ff6b6b22;color:#ff6b6b;border:1px solid #ff6b6b44}.btn-danger:hover{background:#ff6b6b44}
.btn:disabled{opacity:.4;cursor:not-allowed;transform:none}
.btn.loading::after{content:'';width:12px;height:12px;border:2px solid currentColor;border-top-color:transparent;border-radius:50%;animation:spin .6s linear infinite;display:inline-block}
@keyframes spin{to{transform:rotate(360deg)}}

-- INPUTS --
.input{width:100%;padding:8px 11px;background:#111b27;border:1px solid #243447;border-radius:7px;color:#e6edf3;font-size:13px;outline:none;transition:border-color .15s;box-sizing:border-box}
.input:focus{border-color:#d4a520;box-shadow:0 0 0 3px #d4a52022}
.input::placeholder{color:#8b949e}
.select{appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%238b949e' d='M6 8L1 3h10z'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 10px center;padding-right:30px}

-- BADGES Y TAGS --
.badge{display:inline-flex;align-items:center;padding:2px 8px;border-radius:99px;font-size:11px;font-weight:600}
.badge-gold{background:#d4a52022;color:#d4a520;border:1px solid #d4a52044}
.badge-green{background:#3fb95022;color:#3fb950;border:1px solid #3fb95044}
.badge-red{background:#ff6b6b22;color:#ff6b6b;border:1px solid #ff6b6b44}
.badge-blue{background:#58a6ff22;color:#58a6ff;border:1px solid #58a6ff44}
.tag{display:inline-flex;align-items:center;gap:4px;padding:3px 8px;background:#1a2332;border:1px solid #243447;border-radius:5px;font-size:11px;color:#8b949e;cursor:pointer;transition:all .15s}
.tag:hover,.tag.active{border-color:#d4a520;color:#d4a520;background:#d4a52011}

-- CARDS --
.card{background:#111b27;border:1px solid #1e2d3d;border-radius:10px;padding:12px;transition:border-color .15s}
.card:hover{border-color:#243447}
.card.selected{border-color:#d4a520;background:#d4a52008}

-- PROGRESS BAR --
.progress-track{height:6px;background:#1a2332;border-radius:3px;overflow:hidden}
.progress-fill{height:100%;background:linear-gradient(90deg,#d4a520,#e6b822);border-radius:3px;transition:width .4s ease;box-shadow:0 0 8px #d4a52044}

-- TABS --
.tabs{display:flex;gap:2px;padding:4px;background:#111b27;border-radius:8px;border:1px solid #1e2d3d}
.tab{flex:1;padding:6px 12px;border-radius:6px;border:none;background:transparent;color:#8b949e;font-size:12px;cursor:pointer;transition:all .15s;text-align:center}
.tab.active{background:#d4a520;color:#0d1117;font-weight:700}

-- CHECKBOX --
.checkbox{width:16px;height:16px;border:2px solid #243447;border-radius:4px;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;transition:all .15s}
.checkbox.checked{background:#d4a520;border-color:#d4a520}
.checkbox.checked::after{content:'checkmark';color:#0d1117;font-size:10px;font-weight:900}

-- MODAL INTERNO (usar absolute, NUNCA fixed) --
.overlay{position:absolute;inset:0;background:#0d111780;display:flex;align-items:center;justify-content:center;z-index:100}
.modal{background:#111b27;border:1px solid #243447;border-radius:12px;padding:20px;max-width:320px;width:90%;box-shadow:0 20px 60px #00000080}

-- TOAST --
.toast{position:absolute;bottom:12px;right:12px;left:12px;padding:10px 14px;border-radius:8px;font-size:12px;font-weight:600;animation:slideUp .3s ease;z-index:200}
.toast-success{background:#3fb95022;border:1px solid #3fb95044;color:#3fb950}
.toast-error{background:#ff6b6b22;border:1px solid #ff6b6b44;color:#ff6b6b}
@keyframes slideUp{from{transform:translateY(20px);opacity:0}to{transform:translateY(0);opacity:1}}

────────────────────────────────────────────────────
SVG CHARTS COMPLETOS (sin librerías, todo inline)
────────────────────────────────────────────────────

-- BAR CHART (vertical) --
function drawBarChart(containerId, data, opts={}) {
  const {w=300,h=200,color='#d4a520',bg='#0d1117'}=opts;
  const max=Math.max(...data.map(d=>d.value));
  const bw=Math.floor(w/data.length)-8;
  const bars=data.map((d,i)=>{
    const bh=Math.round((d.value/max)*(h-40));
    const x=i*(bw+8)+4; const y=h-40-bh;
    return '<rect x="'+x+'" y="'+y+'" width="'+bw+'" height="'+bh+'" rx="3" fill="'+color+'88"/>'+
           '<text x="'+(x+bw/2)+'" y="'+(h-8)+'" text-anchor="middle" fill="#8b949e" font-size="10">'+d.label+'</text>'+
           '<text x="'+(x+bw/2)+'" y="'+(y-4)+'" text-anchor="middle" fill="#e6edf3" font-size="10">'+d.value+'</text>';
  }).join('');
  document.getElementById(containerId).innerHTML=
    '<svg width="'+w+'" height="'+h+'" style="width:100%;height:'+h+'px">'+
    '<rect width="'+w+'" height="'+h+'" fill="'+bg+'"/>'+bars+
    '<line x1="0" y1="'+(h-40)+'" x2="'+w+'" y2="'+(h-40)+'" stroke="#243447" stroke-width="1"/>'+
    '</svg>';
}
// Uso: drawBarChart('chart', [{label:'Ene',value:42},{label:'Feb',value:67}])

-- DONUT CHART --
function drawDonut(svgId, segments, size=120) {
  const total=segments.reduce((s,d)=>s+d.value,0);
  const r=46; const cx=size/2; const cy=size/2; const circ=2*Math.PI*r;
  let offset=0;
  const slices=segments.map(d=>{
    const pct=d.value/total; const dash=circ*pct; const gap=circ-dash;
    const el='<circle cx="'+cx+'" cy="'+cy+'" r="'+r+'" fill="none" stroke="'+d.color+'"'+
              ' stroke-width="14" stroke-dasharray="'+dash.toFixed(1)+' '+gap.toFixed(1)+'"'+
              ' stroke-dashoffset="'+(-offset).toFixed(1)+'" transform="rotate(-90 '+cx+' '+cy+')">'+
              '<title>'+d.label+': '+d.value+'</title></circle>';
    offset+=circ*pct; return el;
  }).join('');
  document.getElementById(svgId).innerHTML=
    '<circle cx="'+cx+'" cy="'+cy+'" r="'+r+'" fill="none" stroke="#1a2332" stroke-width="14"/>'+slices;
}

-- LINE CHART --
function drawLine(containerId, points, opts={}) {
  const {w=300,h=150,color='#d4a520',bg='#0d1117',fill=true}=opts;
  const mn=Math.min(...points); const mx=Math.max(...points);
  const px=points.map((p,i)=>({x:(i/(points.length-1))*(w-20)+10, y:h-10-((p-mn)/(mx-mn||1))*(h-20)}));
  const path=px.map((p,i)=>(i?'L':'M')+p.x+','+p.y).join(' ');
  const area=fill?'<path d="'+path+' L'+px[px.length-1].x+','+(h-10)+' L'+px[0].x+','+(h-10)+' Z" fill="'+color+'22"/>':'';
  document.getElementById(containerId).innerHTML=
    '<svg width="'+w+'" height="'+h+'" style="width:100%;height:'+h+'px">'+
    '<rect width="'+w+'" height="'+h+'" fill="'+bg+'"/>'+area+
    '<path d="'+path+'" fill="none" stroke="'+color+'" stroke-width="2" stroke-linecap="round"/>'+
    px.map(p=>'<circle cx="'+p.x+'" cy="'+p.y+'" r="3" fill="'+color+'"/>').join('')+
    '</svg>';
}

-- GAUGE / VELOCIMETRO --
function drawGauge(svgId, value, max, opts={}) {
  const {color='#d4a520',size=120}=opts;
  const pct=Math.min(value/max,1); const r=46; const cx=size/2; const cy=size*0.65;
  const startX=cx-r; const startY=cy; const endX=cx+r; const endY=cy;
  const angle=Math.PI*pct;
  const arcX=cx+r*Math.cos(Math.PI-angle); const arcY=cy-r*Math.sin(Math.PI-angle);
  document.getElementById(svgId).innerHTML=
    '<path d="M'+startX+','+startY+' A'+r+','+r+' 0 0,1 '+endX+','+endY+'" fill="none" stroke="#1a2332" stroke-width="12" stroke-linecap="round"/>'+
    '<path d="M'+startX+','+startY+' A'+r+','+r+' 0 0,1 '+arcX.toFixed(1)+','+arcY.toFixed(1)+'" fill="none" stroke="'+color+'" stroke-width="12" stroke-linecap="round"/>'+
    '<text x="'+cx+'" y="'+(cy+20)+'" text-anchor="middle" fill="#e6edf3" font-size="18" font-weight="700">'+value+'</text>'+
    '<text x="'+cx+'" y="'+(cy+34)+'" text-anchor="middle" fill="#8b949e" font-size="11">de '+max+'</text>';
}

────────────────────────────────────────────────────
PATRONES DE LISTA AVANZADOS
────────────────────────────────────────────────────

-- LISTA CON FILTRO Y BUSQUEDA --
function fuzzySearch(items, query, key='name') {
  if(!query) return items;
  const q=query.toLowerCase();
  return items.filter(it=>(it[key]||'').toLowerCase().includes(q));
}
let searchQuery='';
function renderList() {
  const filtered=fuzzySearch(state.items, searchQuery);
  document.getElementById('list').innerHTML = filtered.length===0
    ? '<div class="empty">No se encontraron resultados</div>'
    : filtered.map((it,i)=>renderItem(it,i)).join('');
}
document.getElementById('search').oninput=e=>{searchQuery=e.target.value;renderList();}

-- LISTA SORTABLE (drag HTML5 nativo, sin CDN) --
let dragIdx=null;
function makeSortable(listEl) {
  listEl.addEventListener('dragstart',e=>{
    dragIdx=+e.target.closest('[data-idx]').dataset.idx;
    e.target.style.opacity='.4';
  });
  listEl.addEventListener('dragend',e=>{e.target.style.opacity='1';});
  listEl.addEventListener('dragover',e=>{
    e.preventDefault();
    const el=e.target.closest('[data-idx]');
    if(!el) return;
    const targetIdx=+el.dataset.idx;
    if(dragIdx!==null && dragIdx!==targetIdx) {
      const newItems=[...state.items];
      const [moved]=newItems.splice(dragIdx,1);
      newItems.splice(targetIdx,0,moved);
      state.items=newItems; dragIdx=targetIdx;
      saveState(); renderList();
    }
  });
}
// En cada item: <div data-idx="\${i}" draggable="true" class="item">...

-- PAGINACION --
let page=0; const PAGE_SIZE=10;
function renderPage() {
  const total=state.items.length; const pages=Math.ceil(total/PAGE_SIZE);
  const slice=state.items.slice(page*PAGE_SIZE,(page+1)*PAGE_SIZE);
  document.getElementById('list').innerHTML=slice.map(renderItem).join('');
  document.getElementById('pagination').innerHTML=
    '<button onclick="changePage(-1)" '+(page===0?'disabled':'')+'>prev</button>'+
    '<span>'+(page+1)+' / '+pages+'</span>'+
    '<button onclick="changePage(1)" '+(page>=pages-1?'disabled':'')+'>sig</button>';
}
function changePage(d){page=Math.max(0,Math.min(Math.ceil(state.items.length/PAGE_SIZE)-1,page+d));renderPage();}

────────────────────────────────────────────────────
FORMULARIOS CON PERSISTENCIA AUTOMATICA
────────────────────────────────────────────────────
Los datos persisten en DB SIN intervención de la IA usando stacklume:save.

-- FORMULARIO COMPACTO (inline en header) --
function addItem() {
  const val=document.getElementById('inp').value.trim();
  if(!val) return;
  state.items=[...state.items, { id: Date.now(), name: val, done: false, createdAt: new Date().toISOString() }];
  document.getElementById('inp').value='';
  saveState();  // persiste en DB automaticamente
  render();
}

-- FORMULARIO EXPANDIDO (modal interno con position:absolute) --
function openAddModal() {
  document.getElementById('overlay').style.display='flex';
  document.getElementById('modal-name').focus();
}
function closeModal() { document.getElementById('overlay').style.display='none'; }
function submitModal() {
  const name=document.getElementById('modal-name').value.trim();
  const price=parseFloat(document.getElementById('modal-price').value||'0');
  if(!name) return;
  state.items=[...state.items,{id:Date.now(),name,price,done:false}];
  closeModal(); saveState(); render();
}

-- EDICION INLINE DE CAMPO --
function editItem(idx, field, value) {
  state.items=state.items.map((it,i)=>i===idx?{...it,[field]:value}:it);
  saveState();
}
// En el HTML del item: <span contenteditable="true" onblur="editItem(\${i},'name',this.textContent)">\${it.name}</span>

-- BORRAR ITEM --
function deleteItem(idx) {
  state.items=state.items.filter((_,i)=>i!==idx);
  saveState(); render();
}

────────────────────────────────────────────────────
UTILIDADES JS INLINE (sin CDN)
────────────────────────────────────────────────────

-- FORMATEO --
const fmt={
  currency:(n,c='EUR')=>new Intl.NumberFormat('es-ES',{style:'currency',currency:c,minimumFractionDigits:0,maximumFractionDigits:2}).format(n),
  compact:(n)=>n>=1e6?(n/1e6).toFixed(1)+'M':n>=1e3?(n/1e3).toFixed(1)+'k':String(n),
  pct:(n,total)=>total?Math.round(n/total*100)+'%':'0%',
  dec:(n,d=1)=>n.toFixed(d),
};

-- FECHAS --
const dateUtils={
  fromNow:(iso)=>{
    const diff=Date.now()-new Date(iso).getTime();
    const m=Math.floor(diff/60000);
    if(m<1)return'ahora mismo';if(m<60)return'hace '+m+'m';
    const h=Math.floor(m/60);if(h<24)return'hace '+h+'h';
    const d=Math.floor(h/24);if(d<7)return'hace '+d+'d';
    return new Date(iso).toLocaleDateString('es-ES',{day:'2-digit',month:'short'});
  },
  format:(iso,opts={})=>new Date(iso).toLocaleDateString('es-ES',{day:'2-digit',month:'short',year:'numeric',...opts}),
  isToday:(iso)=>new Date(iso).toDateString()===new Date().toDateString(),
};

-- ORDENACION --
function sortBy(arr, field, asc=true) {
  return [...arr].sort((a,b)=>{
    const va=a[field]??''; const vb=b[field]??'';
    const cmp=typeof va==='number'?va-vb:String(va).localeCompare(String(vb));
    return asc?cmp:-cmp;
  });
}

-- UTILIDADES --
const uid=()=>Math.random().toString(36).slice(2,10)+Date.now().toString(36);
const debounce=(fn,ms)=>{let t;return(...a)=>{clearTimeout(t);t=setTimeout(()=>fn(...a),ms)};};
const clone=obj=>JSON.parse(JSON.stringify(obj));

────────────────────────────────────────────────────
ANIMACIONES CSS (inline, sin CDN)
────────────────────────────────────────────────────
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes slideUp{from{transform:translateY(12px);opacity:0}to{transform:translateY(0);opacity:1}}
@keyframes slideRight{from{transform:translateX(-12px);opacity:0}to{transform:translateX(0);opacity:1}}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
@keyframes popIn{0%{transform:scale(.5);opacity:0}70%{transform:scale(1.1)}100%{transform:scale(1);opacity:1}}

.item-new{animation:slideUp .25s ease}
.skeleton{background:linear-gradient(90deg,#1a2332 25%,#243447 50%,#1a2332 75%);background-size:200% 100%;animation:shimmer 1.5s infinite;border-radius:6px}

// Contador numérico animado
function animateCounter(el, target, duration=800) {
  const start=parseInt(el.textContent)||0; const startTime=performance.now();
  const update=t=>{
    const pct=Math.min((t-startTime)/duration,1);
    const ease=1-Math.pow(1-pct,3);
    el.textContent=Math.round(start+(target-start)*ease);
    if(pct<1) requestAnimationFrame(update);
  };
  requestAnimationFrame(update);
}

────────────────────────────────────────────────────
LAYOUTS AVANZADOS
────────────────────────────────────────────────────

-- SPLIT VIEW (lista + detalle) --
body{display:grid;grid-template-columns:200px 1fr;grid-template-rows:auto 1fr;height:100%;overflow:hidden}
.header{grid-column:1/-1}
.sidebar{overflow-y:auto;border-right:1px solid #243447}
.detail{overflow-y:auto;padding:12px}

-- MINI KANBAN (3 columnas) --
.kanban{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;height:100%;overflow:hidden}
.column{display:flex;flex-direction:column;background:#111b27;border-radius:8px;overflow:hidden}
.column-header{padding:8px 12px;font-size:11px;font-weight:700;letter-spacing:.05em;border-bottom:1px solid #1e2d3d}
.column-body{flex:1;overflow-y:auto;padding:6px}
.kanban-card{background:#1a2332;border:1px solid #1e2d3d;border-radius:7px;padding:8px;margin-bottom:5px;font-size:12px;cursor:grab;transition:border-color .15s}
.kanban-card:hover{border-color:#d4a520}

-- HEATMAP (tipo GitHub contributions) --
function renderHeatmap(containerId, data) {
  const today=new Date(); const weeks=14;
  let html='<div style="display:grid;grid-template-rows:repeat(7,10px);grid-auto-flow:column;gap:2px">';
  for(let w=weeks-1;w>=0;w--) {
    for(let d=0;d<7;d++) {
      const dt=new Date(today);
      dt.setDate(dt.getDate()-(w*7+d));
      const key=dt.toISOString().slice(0,10);
      const v=data[key]||0;
      const opacity=v===0?'0.1':v<3?'0.4':v<6?'0.7':'1';
      html+='<div title="'+key+': '+v+'" style="width:10px;height:10px;background:#d4a520;opacity:'+opacity+';border-radius:2px"></div>';
    }
  }
  document.getElementById(containerId).innerHTML=html+'</div>';
}

-- TIMELINE --
.timeline{position:relative;padding-left:24px}
.timeline::before{content:'';position:absolute;left:8px;top:0;bottom:0;width:2px;background:linear-gradient(180deg,#d4a520,#243447)}
.timeline-item{position:relative;margin-bottom:14px;padding-left:4px}
.timeline-item::before{content:'';position:absolute;left:-19px;top:5px;width:8px;height:8px;border-radius:50%;background:#d4a520;border:2px solid #0d1117}

────────────────────────────────────────────────────
PLANTILLA CANVAS (copiar y adaptar)
────────────────────────────────────────────────────
<!DOCTYPE html><html><head><style>*{margin:0;padding:0;box-sizing:border-box}body{background:#0d1117;color:#e6edf3;font-family:system-ui,sans-serif;width:100%;height:100%;overflow:hidden}canvas{display:block;width:100%;height:100%}</style></head><body><canvas id="c"></canvas><script>
const CONFIG=(typeof {{CONFIG_JSON}}!=='undefined')?{{CONFIG_JSON}}:{};
const canvas=document.getElementById('c'),ctx=canvas.getContext('2d');
function resize(w,h){canvas.width=w||canvas.offsetWidth;canvas.height=h||canvas.offsetHeight;draw();}
new ResizeObserver(([e])=>resize(e.contentRect.width,e.contentRect.height)).observe(canvas);
window.addEventListener('message',e=>{if(e.data&&e.data.type==='stacklume:resize')resize(e.data.width,e.data.height);});
function draw(){ctx.fillStyle='#0d1117';ctx.fillRect(0,0,canvas.width,canvas.height);/* usa #d4a520 para highlights */}
</script></body></html>

────────────────────────────────────────────────────
PLANTILLA MAESTRA: WIDGET AUTO-SAVING COMPLETO
────────────────────────────────────────────────────
Esta plantilla incluye: parseo de CONFIG, persistencia via postMessage,
estado vacío, formulario de añadir, lista de items, borrar items.
Usar como base para CUALQUIER widget de lista/colección.

<!DOCTYPE html><html><head><meta charset="utf-8"><style>
*{margin:0;padding:0;box-sizing:border-box}
::-webkit-scrollbar{width:5px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:#d4a520;border-radius:3px}
body{background:#0d1117;color:#e6edf3;font-family:system-ui,sans-serif;height:100%;display:flex;flex-direction:column;overflow:hidden}
.header{padding:10px 12px;border-bottom:1px solid #1e2d3d;display:flex;align-items:center;gap:8px;flex-shrink:0}
.title{font-size:13px;font-weight:700;color:#d4a520;flex:1}.count{font-size:11px;color:#8b949e}
.add-row{display:flex;gap:6px;padding:8px 10px;border-bottom:1px solid #1e2d3d;flex-shrink:0}
.inp{flex:1;padding:6px 10px;background:#111b27;border:1px solid #243447;border-radius:6px;color:#e6edf3;font-size:12px;outline:none;transition:border-color .15s}
.inp:focus{border-color:#d4a520}.inp::placeholder{color:#8b949e55}
.btn-add{padding:6px 12px;background:#d4a520;color:#0d1117;border:none;border-radius:6px;font-size:12px;font-weight:700;cursor:pointer;white-space:nowrap}
.btn-add:hover{background:#e6b822}
.list{flex:1;overflow-y:auto;padding:6px}
.item{display:flex;align-items:center;gap:8px;padding:8px 10px;background:#111b27;border:1px solid #1e2d3d;border-radius:7px;margin-bottom:5px;transition:border-color .15s}
.item:hover{border-color:#243447}.item-name{flex:1;font-size:12px}
.item-del{color:#8b949e;background:none;border:none;cursor:pointer;font-size:14px;padding:0 2px;opacity:0;transition:opacity .15s}
.item:hover .item-del{opacity:1}.item-del:hover{color:#ff6b6b}
.empty{display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;gap:8px;color:#8b949e;text-align:center;padding:20px}
.empty-icon{font-size:28px;opacity:.4}
.footer{padding:6px 12px;border-top:1px solid #1e2d3d;font-size:10px;color:#8b949e55;flex-shrink:0;text-align:right}
.toast{position:absolute;bottom:8px;right:8px;padding:6px 12px;border-radius:6px;font-size:11px;font-weight:600;animation:fadeIn .2s ease;z-index:50}
.toast-ok{background:#3fb95022;border:1px solid #3fb95044;color:#3fb950}
@keyframes fadeIn{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}
@keyframes slideUp{from{transform:translateY(8px);opacity:0}to{transform:translateY(0);opacity:1}}
</style></head><body>
<div class="header"><span class="title" id="wtitle">Mi Colección</span><span class="count" id="wcount"></span></div>
<div class="add-row">
  <input class="inp" id="inp" placeholder="Añadir nuevo item..." onkeydown="if(event.key==='Enter')addItem()">
  <button class="btn-add" onclick="addItem()">+ Añadir</button>
</div>
<div class="list" id="list"></div>
<div class="footer">Stacklume Widget</div>
<script>
const CONFIG=(typeof {{CONFIG_JSON}}!=='undefined')?{{CONFIG_JSON}}:{};
let state={title:'Mi Colección',items:[],...CONFIG};
function save(){window.parent.postMessage({type:'stacklume:save',config:state},'*');}
window.addEventListener('message',e=>{
  if(e.data?.type==='stacklume:resize'){}
  if(e.data?.type==='stacklume:saved'&&e.data.success)showToast('Guardado','ok');
});
function addItem(){
  const v=document.getElementById('inp').value.trim();
  if(!v)return;
  state.items=[...state.items,{id:Date.now(),name:v,done:false}];
  document.getElementById('inp').value='';
  save();render();
}
function deleteItem(id){state.items=state.items.filter(it=>it.id!==id);save();render();}
function toggleItem(id){state.items=state.items.map(it=>it.id===id?{...it,done:!it.done}:it);save();render();}
function render(){
  document.getElementById('wtitle').textContent=state.title||'Mi Colección';
  document.getElementById('wcount').textContent=state.items.length+' items';
  const list=document.getElementById('list');
  if(!state.items.length){
    list.innerHTML='<div class="empty"><div class="empty-icon">📋</div><div>Sin items aún</div><div style="font-size:11px;margin-top:4px">Escribe arriba para añadir el primero</div></div>';
  }else{
    list.innerHTML=state.items.map(it=>
      '<div class="item" style="animation:slideUp .2s ease">'+
      '<span style="cursor:pointer;flex:1;display:flex;align-items:center;gap:6px" onclick="toggleItem('+it.id+')">'+
      '<span style="opacity:'+(it.done?.4:1)+';text-decoration:'+(it.done?'line-through':'none')+
      ';color:'+(it.done?'#8b949e':'#e6edf3')+'" class="item-name">'+(it.done?'✓ ':'')+it.name+'</span>'+
      '</span>'+
      '<button class="item-del" onclick="deleteItem('+it.id+')">×</button>'+
      '</div>'
    ).join('');
  }
}
function showToast(msg,type){
  const t=document.createElement('div');
  t.className='toast toast-'+type;t.textContent=msg;
  document.body.appendChild(t);setTimeout(()=>t.remove(),1800);
}
render();
</script></body></html>

────────────────────────────────────────────────────
REGLA DE ORO — WIDGETS COMPLETOS DESDE EL PRIMER MOMENTO
────────────────────────────────────────────────────
El htmlTemplate ES la aplicación completa. El widget funciona perfectamente con items:[].
CORRECTO:
  - Crear widget con defaultConfig: {items:[]} y HTML con estado vacío ("Tu lista está vacía")
  - Tras crear: decir solo "He creado tu widget. Refresca la página (F5) para verlo."
  - Si el usuario pide items CONCRETOS → agrégalos vía update_widget EN EL MISMO TURNO
  - Los widgets con formularios guardan sus datos via stacklume:save automaticamente
INCORRECTO:
  - Crear widget y luego pedir "dime URLs para añadirlas" (el widget YA está completo)
  - Crear widget y decir "ahora configúralo con datos" (no hay nada que configurar manualmente)
  - Decir al usuario "puedes añadir items diciéndome X" como paso de configuración
  - Hardcodear datos de ejemplo en el HTML en lugar de leerlos de CONFIG
  - Decir al usuario que "los datos se pierden al refrescar" (se guardan automaticamente)

REGLA: si el usuario pide "crea una lista de tareas" → créala con items:[] y formulario propio.
       si el usuario pide "crea una lista con estas tareas: ..." → créala Y añade los items via update_widget.

────────────────────────────────────────────────────
BEST PRACTICES PARA WIDGETS INTERACTIVOS
────────────────────────────────────────────────────
• Todos los widgets interactivos usan stacklume:save para persistencia total
• Añade busqueda/filtro JS inline si el widget puede tener muchos items
• Para contadores/estadísticas, calcúlalos desde state.items en render time
• Estado vacío completo con mensaje útil e icono descriptivo
• El estado vacío debe mostrar QUE HACE el widget y como añadir el primer item
• Incluye siempre un toast de confirmación tras guardar
• Usa animación slideUp para items nuevos que aparecen en la lista

────────────────────────────────────────────────────
FLUJOS DE TRABAJO COMUNES
────────────────────────────────────────────────────
Crear widget nuevo:
  get_app_info → (opcional) list_widget_types → add_widget
  O: create_custom_widget_type → add_custom_widget

Añadir ítem a widget existente desde la IA (wishlist, lista de tareas, etc.):
  list_widgets → leer config → modificar config.items → update_widget(id, {config: nuevaConfig})

Actualizar template HTML/CSS/JS de tipo personalizado:
  list_custom_widget_types → update_custom_widget_type(id, {htmlTemplate: nuevoTemplate})
  → Todas las instancias existentes mostrarán el nuevo template al refrescar

Gestionar enlaces (no widgets):
  list_links / add_link / update_link / delete_link

Gestión de workspaces:
  list_projects → add_widget con projectId específico`,
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
