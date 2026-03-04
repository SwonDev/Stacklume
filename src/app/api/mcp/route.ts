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
          instructions: `═══════════════════════════════════════════════════
STACKLUME MCP — GUÍA COMPLETA DEL SERVIDOR
═══════════════════════════════════════════════════

STACKLUME es un dashboard personal de gestión de enlaces y widgets con bento grid.
URL base: window.location.origin + "/api/mcp"

────────────────────────────────────────────────────
ARQUITECTURA DEL DASHBOARD
────────────────────────────────────────────────────
• Bento grid de 12 columnas, filas dinámicas (~80px/fila)
• Cada widget tiene: type, title, config (JSON), layout {x,y,w,h}, projectId
• Proyectos = workspaces independientes (projectId null = Home)
• Vistas disponibles: bento (drag&drop), kanban (columnas), list

TAMAÑOS DE WIDGET (presets):
  small  = 2×2   | medium = 3×3   | large  = 4×4
  wide   = 4×2   | tall   = 2×4
  → Usa defaultWidth/defaultHeight para control exacto dentro de la cuadrícula de 12 cols
  → Ejemplo: un widget de 6×3 ocupa media pantalla en horizontal

────────────────────────────────────────────────────
TIPOS DE WIDGET
────────────────────────────────────────────────────
A) BUILT-IN (190+ tipos): widgets preconstruidos con su propia UI React.
   Flujo: add_widget(type, title, size, config?)
   Datos configurables vía config JSON — usa get_widget_type_schema(type) para ver campos.
   Ejemplos de tipos:
     Links:       favorites, recent, category, tag, quick-add, link-manager
     Productiv.:  notes, todo, pomodoro, calendar, countdown, habit-tracker
     Dev tools:   github-trending, github-search, mcp-explorer, deployment-status
     Media:       youtube, spotify, embed, image, unsplash
     Utilidades:  clock, weather, calculator, qr-code, color-palette, quote
     Texto/Código: json-formatter, markdown-preview, regex-tester, jwt-decoder
     Juegos:      sprite-sheet, pathfinding, pixel-art, physics-playground, particle-system
     CSS gen.:    gradient-generator, glassmorphism, box-shadow-generator, css-animation
     Org./Dev.:   code-snippets, api-reference, env-vars, git-commands, pr-checklist

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
4. Para actualizar DATOS de una instancia específica:
   list_widgets → localizar widget_id → update_widget({config: nuevaConfig})
5. Para actualizar el HTML/CSS/JS de TODAS las instancias de un tipo:
   update_custom_widget_type(id, {htmlTemplate: nuevoTemplate})

────────────────────────────────────────────────────
⚠️  GESTIÓN DE DATOS EN WIDGETS PERSONALIZADOS — CRÍTICO
────────────────────────────────────────────────────
Los datos de widgets custom-user NO se pueden editar desde la UI de Stacklume
(no existe formulario manual). El único canal para modificar config es el MCP.

PATRÓN CORRECTO para añadir/modificar datos (ej: añadir item a una wishlist):
  1. list_widgets → encontrar el widget por título/tipo
  2. Leer config actual del widget (campo "config")
  3. Modificar config: añadir/editar/borrar items en config.items[]
  4. update_widget(widget_id, {config: configModificada})  ← SIEMPRE mantener _customTypeId
  5. Informar al usuario que debe refrescar (F5)

NUNCA decir al usuario "edita la config manualmente" — hazlo tú directamente.
Cuando el usuario pida añadir/quitar datos de cualquier widget, ejecuta update_widget sin pedir confirmación.

────────────────────────────────────────────────────
⚠️  ESTADO EFÍMERO vs DATOS PERSISTENTES
────────────────────────────────────────────────────
El iframe sandbox NO tiene localStorage, cookies ni acceso al DOM padre.
• Estado EFÍMERO (se pierde al refrescar iframe): filtro activo, elemento hovereado, animaciones
• Datos PERSISTENTES: siempre en CONFIG → se recargan automáticamente al abrir el widget
• Para "guardar" selecciones del usuario (ej: item marcado como comprado):
  → el widget no puede comunicarse hacia fuera solo
  → el usuario debe pedir explícitamente que actualices los datos vía update_widget
  → diseña los widgets para que defaultConfig refleje el estado deseado

────────────────────────────────────────────────────
⚠️  REFRESCO DE UI OBLIGATORIO
────────────────────────────────────────────────────
El dashboard carga widgets en memoria al iniciar y NO auto-detecta cambios externos.
Después de CUALQUIER add_widget / update_widget / remove_widget / add_custom_widget:
→ El usuario DEBE refrescar la página (F5 / Ctrl+R / Cmd+R) para ver los cambios.
→ SIEMPRE recuerda esto al usuario al final de cada operación de widget.

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
::-webkit-scrollbar{width:6px;height:6px}
::-webkit-scrollbar-track{background:transparent}
::-webkit-scrollbar-thumb{background:#d4a520;border-radius:3px}
::-webkit-scrollbar-thumb:hover{background:#e6b822}

────────────────────────────────────────────────────
GUÍA HTML PARA WIDGETS PERSONALIZADOS
────────────────────────────────────────────────────
Sandbox: <iframe sandbox="allow-scripts"> — SIN red, localStorage, cookies ni DOM padre.
PROHIBIDO: fetch(), XMLHttpRequest, import(), WebSocket, recursos externos (CDN).
TODO debe ser inline: CSS, JS, SVG, fuentes (base64 si necesario).

ACCESO A CONFIG: escribe el literal {{CONFIG_JSON}} en el template.
  Se sustituye por JSON.stringify(instanceConfig) al renderizar.
  Uso: const CONFIG = {{CONFIG_JSON}};
  Siempre proporciona fallbacks: const items = (CONFIG && CONFIG.items) || [];

REGLAS CRÍTICAS DE CSS:
  • body { height: 100vh; overflow: hidden; } — el iframe toma el 100% del widget
  • Si hay scroll: body { overflow: auto; } + scrollbars dorados obligatorios
  • NUNCA usar position:fixed — el iframe ya es el viewport
  • Usar display:flex + flex-direction:column en body para layouts verticales

REGLAS CRÍTICAS DE JS:
  • Canvas: usa ResizeObserver (el iframe no emite resize events al redimensionar el widget)
  • IDs únicos en el DOM — no usar id="app" si el widget puede instanciarse varias veces
  • Maneja undefined: const cfg = (typeof CONFIG !== 'undefined') ? CONFIG : {};
  • requestAnimationFrame funciona normalmente dentro del iframe

PLANTILLA CANVAS (copiar y adaptar):
<!DOCTYPE html><html><head><style>*{margin:0;padding:0;box-sizing:border-box}body{background:#0d1117;color:#e6edf3;font-family:system-ui,sans-serif;width:100%;height:100vh;overflow:hidden}canvas{display:block;width:100%;height:100%}</style></head><body><canvas id="c"></canvas><script>
const CONFIG=(typeof {{CONFIG_JSON}}!=='undefined')?{{CONFIG_JSON}}:{};
const canvas=document.getElementById('c'),ctx=canvas.getContext('2d');
const ro=new ResizeObserver(([e])=>{canvas.width=e.contentRect.width;canvas.height=e.contentRect.height;draw();});
ro.observe(canvas);
function draw(){ctx.fillStyle='#0d1117';ctx.fillRect(0,0,canvas.width,canvas.height);/* tu lógica — usa #d4a520 para highlights */}
</script></body></html>

PLANTILLA HTML/CSS CON LISTA (copiar y adaptar):
<!DOCTYPE html><html><head><meta charset="utf-8"><style>*{margin:0;padding:0;box-sizing:border-box}::-webkit-scrollbar{width:6px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:#d4a520;border-radius:3px}body{background:#0d1117;color:#e6edf3;font-family:system-ui,sans-serif;height:100vh;display:flex;flex-direction:column;overflow:hidden}.header{padding:10px 14px;border-bottom:1px solid #243447;flex-shrink:0;color:#d4a520;font-weight:700;font-size:13px}.list{flex:1;overflow-y:auto;padding:8px}.item{background:#111b27;border:1px solid #1e2d3d;border-radius:8px;padding:9px 11px;margin-bottom:5px}.footer{padding:8px 14px;border-top:1px solid #243447;flex-shrink:0;font-size:11px;color:#8b949e}</style></head><body>
<div class="header" id="title">Widget</div>
<div class="list" id="list"></div>
<div class="footer" id="footer"></div>
<script>
const CONFIG=(typeof {{CONFIG_JSON}}!=='undefined')?{{CONFIG_JSON}}:{};
const items=(CONFIG&&CONFIG.items)||[];
document.getElementById('title').textContent=CONFIG.title||'Mi Widget';
document.getElementById('list').innerHTML=items.map(it=>\`<div class="item">\${it.name||it}</div>\`).join('');
document.getElementById('footer').textContent=items.length+' elementos';
</script></body></html>

────────────────────────────────────────────────────
BEST PRACTICES PARA WIDGETS INTERACTIVOS
────────────────────────────────────────────────────
• Diseña el widget para que CONFIG refleje el estado completo que quieres persistir
  Ejemplo wishlist: items[].purchased = true/false — el usuario pide "marca X como comprado"
  → tú actualizas config.items directamente con update_widget
• Si el widget tiene muchos items, añade búsqueda/filtro en JS inline
• Para contadores/estadísticas, calcúlalos desde CONFIG.items en render time
• Evita estado global mutable — todo debe derivarse de CONFIG
• Añade siempre un mensaje de estado vacío: if(items.length===0) mostrar placeholder

────────────────────────────────────────────────────
FLUJOS DE TRABAJO COMUNES
────────────────────────────────────────────────────
Crear widget nuevo:
  get_app_info → (opcional) list_widget_types → add_widget O create_custom_widget_type + add_custom_widget

Añadir ítem a widget existente (wishlist, lista de tareas, etc.):
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
