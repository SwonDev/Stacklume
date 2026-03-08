# Stacklume — Arquitectura técnica

Este documento describe la arquitectura y diseño técnico de Stacklume v0.3.22.

---

## Descripción general

Stacklume es un dashboard de gestión de bookmarks con layout tipo bento grid. Existe en dos modos:

| Modo | Base de datos | Autenticación | URL |
|------|--------------|---------------|-----|
| **Web (self-hosted)** | Neon PostgreSQL | JWT/bcrypt propio | stacklume.vercel.app |
| **Desktop (Windows)** | SQLite local | Sin auth — uso personal | Aplicación Tauri |
| **Demo** | localStorage (navegador) | Sin auth — datos públicos demo | demo.stacklume.app |

---

## Stack tecnológico

| Capa | Tecnología |
|------|-----------|
| Framework | Next.js 16 (App Router) + React 19 |
| Base de datos | Neon PostgreSQL (web) · SQLite via @libsql/client (desktop) |
| ORM | Drizzle ORM 0.45 |
| Estado | Zustand 5 |
| UI | shadcn/ui (new-york) · Radix UI · Tailwind CSS v4 |
| Animaciones | Motion (antes Framer Motion) |
| Grid layout | react-grid-layout |
| Drag & Drop | @dnd-kit (vista Kanban) |
| Formularios | React Hook Form + Zod |
| Autenticación | JWT personalizado + bcryptjs (NO NextAuth) |
| Rate limiting | Upstash Redis (opcional) |
| Error monitoring | Sentry |
| Desktop | Tauri v2 + Rust + WebView2 (Windows) |

---

## Arquitectura — Versión web

```
┌─────────────────────────────────────────────────────────┐
│                      Navegador / WebView2               │
│  ┌──────────────────────────────────────────────────┐   │
│  │   React App (Next.js App Router)                 │   │
│  │   Zustand stores · react-grid-layout · shadcn/ui │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                             │ fetch/API
                             ▼
┌─────────────────────────────────────────────────────────┐
│                  Next.js API Routes                     │
│  ┌─────────────┬──────────────┬───────────────────┐    │
│  │  Auth API   │  CRUD APIs   │  APIs externas    │    │
│  │ JWT/bcrypt  │links/widgets │  scrape/github    │    │
│  └─────────────┴──────────────┴───────────────────┘    │
│  ┌─────────────┬──────────────┬───────────────────┐    │
│  │Rate Limiting│   Sentry     │   MCP endpoint    │    │
│  │  (Upstash)  │ Error track  │  /api/mcp (RPC)   │    │
│  └─────────────┴──────────────┴───────────────────┘    │
└─────────────────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────┐
│              Neon PostgreSQL (web)                      │
│  links · categories · tags · link_tags                  │
│  widgets · projects · user_settings · user_backups      │
└─────────────────────────────────────────────────────────┘
```

---

## Arquitectura — Versión desktop (Tauri)

Hay dos modos de ejecución con puertos distintos:

| Modo | Puerto | Cómo arranca |
|------|--------|-------------|
| **Desarrollo** (`pnpm tauri:dev`) | **7878** | `dev-tauri.mjs` inicia Next.js dev en 7878; Tauri conecta a `localhost:7878` |
| **Producción** (app instalada) | **7879** preferido | Rust busca puerto libre desde 7879; si está ocupado prueba el siguiente libre |

### Flujo de producción (app instalada)

```
┌─────────────────────────────────────────────────────────┐
│            stacklume.exe  (Tauri v2 + Rust)             │
│                                                         │
│  1. Muestra loading screen (data: URI, sin parpadeo)    │
│  2. Busca puerto libre (intenta 7879 primero)           │
│  3. Spawna node.exe server.js con CREATE_NO_WINDOW      │
│     ├── DESKTOP_MODE=true (sin auth, sin CSRF)          │
│     ├── DATABASE_PATH=%APPDATA%\...\stacklume.db        │
│     └── Windows Job Object (mata node si stacklume muere│
│  4. Poll /api/health cada 500ms (timeout 40s)           │
│  5. Navega WebView2 al servidor local                   │
│                                                         │
│  Comandos Tauri expuestos al frontend:                  │
│  open_url · get_server_port · get_app_data_dir          │
│  minimize/toggle_maximize/close_window                  │
│  update_tray_icon · download_and_run_update             │
└─────────────────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────┐
│   Node.js 25 + Next.js standalone (embebidos en .exe)   │
│       http://127.0.0.1:7879  (u otro puerto libre)      │
└─────────────────────────────────────────────────────────┘
                             │ SQLite
                             ▼
┌─────────────────────────────────────────────────────────┐
│   %APPDATA%\com.stacklume.app\stacklume.db              │
│   (SQLite via @libsql/client)                           │
└─────────────────────────────────────────────────────────┘
```

Los links externos (`http(s)://`) son interceptados por `AppShell.tsx` y enrutados a través del comando Rust `open_url` → `cmd /c start "" <url>`, porque `<a target="_blank">` no funciona en WebView2.

---

## Sistema dual de bases de datos

El export `db` de `src/lib/db/index.ts` es un **Proxy** que elige transparentemente entre Neon y SQLite según `DESKTOP_MODE`.

**Reglas críticas en todas las rutas API:**

```typescript
// 1. Siempre usar generateId() — PostgreSQL autogenera UUIDs, SQLite no
import { db, generateId } from "@/lib/db";
await db.insert(table).values({ id: generateId(), ...rest }).returning();

// 2. Usar like, no ilike (ilike es solo PostgreSQL)
import { getCurrentDatabaseType } from "@/lib/db";
const fn = getCurrentDatabaseType() === "sqlite" ? like : ilike;

// 3. Los booleanos usan boolCol customType (SQLite devuelve 0/1)
// ✅ boolCol("is_favorite").default(false)
// ❌ boolean("is_favorite").default(false)  ← NO usar en schema.ts

// 4. Soft delete — siempre filtrar
.where(isNull(table.deletedAt))
```

---

## Autenticación

**La app usa un sistema propio de JWT + bcrypt — NO usa NextAuth ni OAuth.**

```
┌─────────┐  POST /api/auth/login   ┌──────────────────────────────┐
│ Browser │ ─────────────────────> │  Verificar bcrypt(password)  │
└─────────┘                        │  Firmar JWT con AUTH_SECRET   │
     │                             │  Cookie: stacklume-auth       │
     │                             │  (HttpOnly, 7 días)           │
     │                             └──────────────────────────────┘
     │
     │  Petición autenticada
     │  (cookie stacklume-auth)
     ▼
┌─────────────────────────────────────────────────────┐
│  src/lib/auth.ts → isAuthenticated() / getSession() │
│  Verifica JWT con jose, extrae userId               │
└─────────────────────────────────────────────────────┘
```

Variables de entorno requeridas en modo web:
```
AUTH_USERNAME=tu-usuario
AUTH_PASSWORD_HASH=<hash bcrypt>   # node -e "require('bcryptjs').hash('pass',10).then(console.log)"
AUTH_SECRET=<random 32 bytes>      # openssl rand -base64 32
```

En **modo desktop** la autenticación se omite completamente (`src/proxy.ts` retorna sin verificar).

---

## Modo demo (demo.stacklume.app)

El modo demo permite probar Stacklume en el navegador sin necesidad de base de datos ni cuenta. Todos los datos se almacenan exclusivamente en el `localStorage` del navegador del usuario.

### Activación

```env
NEXT_PUBLIC_DEMO_MODE=true   # Variable cliente (Next.js)
DEMO_MODE=true               # Variable servidor (omite auth/CSRF en proxy.ts)
```

En Vercel, basta con añadir estas dos variables al proyecto. No se necesita `DATABASE_URL`, `AUTH_USERNAME` ni `AUTH_SECRET`.

### Arquitectura del modo demo

```
┌────────────────────────────────────────────────────────┐
│                    Navegador                           │
│  ┌──────────────────────────────────────────────────┐  │
│  │  DemoProvider.tsx  (monta interceptor en render) │  │
│  └──────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────┐  │
│  │  src/lib/demo/interceptor.ts                     │  │
│  │  Reemplaza window.fetch para /api/* CRUD         │  │
│  │  → Redirige a localStorage en lugar de al server │  │
│  │  Rutas que SÍ van al servidor: /api/scrape,      │  │
│  │  /api/github-*, /api/steam-*, /api/nintendo-*,   │  │
│  │  /api/health, /api/mcp                           │  │
│  └──────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────┐  │
│  │  src/lib/demo/storage.ts                         │  │
│  │  CRUD completo en localStorage:                  │  │
│  │  links, categories, tags, link-tags, widgets,    │  │
│  │  projects, settings, stickers                    │  │
│  └──────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────┐  │
│  │  DemoBanner.tsx — banner informativo fijo        │  │
│  │  (debajo del header, texto corto en mobile)      │  │
│  └──────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────┘
              ↑ Nada sale del navegador
```

### Componentes clave

| Archivo | Función |
|---------|---------|
| `src/lib/demo/interceptor.ts` | Intercepta `window.fetch` y redirige llamadas CRUD a localStorage |
| `src/lib/demo/storage.ts` | Implementa CRUD completo en localStorage (links, categories, tags, widgets, projects, settings) |
| `src/components/demo/DemoProvider.tsx` | Instala el interceptor de forma síncrona en el primer render |
| `src/components/demo/DemoBanner.tsx` | Banner amarillo con enlace a la descarga del instalador desktop |

### `readArrayKey<T>()` — protección contra corrupción

El helper `readArrayKey<T>()` en `storage.ts` incluye un guard `Array.isArray` para evitar `TypeError` si localStorage contiene datos en formato Zustand persist (el valor puede ser un objeto `{state:{...}, version:...}` en lugar de un array):

```typescript
function readArrayKey<T>(key: string): T[] {
  const raw = localStorage.getItem(key);
  if (!raw) return [];
  const parsed = JSON.parse(raw);
  return Array.isArray(parsed) ? parsed : [];
}
```

### Limitaciones del modo demo

- Los datos solo existen en el navegador actual — no hay sincronización entre dispositivos
- No hay backups automáticos al servidor
- El modo demo no es apto para uso en producción con datos reales
- Widgets que necesitan APIs externas (GitHub, Steam, Nintendo) siguen usando el servidor

---

## Gestión de estado (Zustand stores)

| Store | Persistencia | Responsabilidad |
|-------|-------------|-----------------|
| `useLinksStore` | Solo memoria (fetch desde DB) | Links, categorías, tags + estados de modales |
| `useWidgetStore` | Base de datos (API) | Widgets e instancias |
| `useLayoutStore` | localStorage | Posiciones react-grid-layout |
| `useKanbanStore` | localStorage (`stacklume-kanban-columns`) | Columnas Kanban, límites WIP |
| `useSettingsStore` | Base de datos (API) | Preferencias: tema, densidad, idioma... |
| `useProjectsStore` | Base de datos (API) | Proyectos/workspaces |
| `useStickerStore` | localStorage | Pegatinas sobre el dashboard |
| `useListViewStore` | Memoria | Ajustes vista lista |

`useLinksStore` **no tiene persist middleware**. Usa `refreshAllData()` para re-cargar todos los datos desde el servidor con un solo `set()` atómico. Llamarlo siempre después de mutaciones al servidor para evitar lecturas cacheadas de WebView2.

`useWidgetStore` usa `?_t=${Date.now()}` en todos los fetch para evitar el caché HTTP de WebView2.

---

## Sistema de widgets (120+)

Los widgets se renderizan en un grid react-grid-layout en vista Bento. Cada widget es:

- Un tipo (string clave) definido en `src/types/widget.ts`
- Una configuración JSON (`config`) específica del tipo
- Una posición en el grid (`layoutX/Y/W/H`) y en Kanban (`kanbanColumnId/Order/Height`)
- Customización visual: `backgroundColor`, `backgroundGradient`, `accentColor`, `opacity`, `isLocked`

**Categorías de widgets:**

| Categoría | Ejemplos |
|-----------|---------|
| Links | favorites, recent, category, tag, quick-add |
| Productividad | notes, todo, pomodoro, calendar, habit-tracker |
| Analytics | stats, link-analytics, tag-cloud, github-activity |
| Media | youtube, spotify, codepen, unsplash |
| Developer | github-trending, mcp-explorer, qr-code |
| Utilidades | clock, weather, calculator, crypto |
| Text/Code Tools | json-formatter, base64, regex-tester, jwt-decoder |
| Converters | unit-converter, currency, timezone, color |
| CSS Generators | gradient, glassmorphism, box-shadow, clip-path |
| Game Dev | sprite-sheet, tilemap, particle-system, skill-tree |
| Custom | widget personalizado IA (`custom-user`) en iframe sandboxed |

**Widgets personalizados IA** (`custom-user`): El MCP genera un `htmlTemplate` (página HTML completa). El placeholder `{{CONFIG_JSON}}` se sustituye con `JSON.stringify(config)` en render. El iframe se comunica con la app via postMessage (`stacklume:save/get-config`).

---

## Servidor MCP

`POST /api/mcp` — JSON-RPC 2.0, autenticación via `Authorization: Bearer <mcpApiKey>`.

23 herramientas disponibles: CRUD de widgets, tipos personalizados, links, categorías, tags, proyectos, settings.

Configuración en Settings → "MCP" (genera token aleatorio + muestra snippets para Claude Desktop / Cursor).

---

## Modos de vista

| Modo | Librería | Descripción |
|------|---------|-------------|
| **Bento** | react-grid-layout | Grid arrastrable y redimensionable |
| **Kanban** | @dnd-kit | Columnas con límites WIP, filtros por tipo |
| **Lista** | Scroll nativo | Vista compacta con ordenación |

---

## Estructura de directorios

```
src/
├── app/
│   ├── api/                  # Rutas REST API
│   │   ├── auth/             # login / logout / session
│   │   ├── links/            # CRUD + import + reorder
│   │   ├── widgets/          # CRUD + layouts + clear
│   │   ├── categories/       # CRUD + reorder
│   │   ├── tags/             # CRUD + reorder + link-associations
│   │   ├── projects/         # CRUD + reorder
│   │   ├── settings/         # Preferencias de usuario
│   │   ├── scrape/           # Metadata de URLs (con protección SSRF)
│   │   └── mcp/              # Servidor MCP JSON-RPC
│   ├── layout.tsx            # Root layout + inyección DESKTOP_MODE
│   └── page.tsx              # Dashboard principal
├── components/
│   ├── bento/                # BentoGrid + BentoCard
│   ├── demo/                 # DemoBanner, componentes específicos del modo demo
│   ├── desktop/              # TitleBar, UpdateChecker, TrayIconUpdater
│   ├── kanban/               # KanbanColumn + KanbanLinkListWidget
│   ├── layout/               # Header, Sidebar, FilterBar, BulkActionsBar
│   ├── links/                # RichLinkCard
│   ├── modals/               # Modales add/edit para links, widgets, etc.
│   ├── stickers/             # StickerLayer + StickerContextMenu
│   ├── ui/                   # Componentes shadcn/ui
│   └── widgets/              # 120+ implementaciones de widgets
├── hooks/
│   ├── useKeyboardShortcuts.ts
│   ├── useKanbanShortcuts.ts
│   └── useMultiSelect.ts     # Store Zustand para selección múltiple
├── lib/
│   ├── db/
│   │   ├── index.ts          # Proxy Neon/SQLite + generateId() + withRetry()
│   │   ├── schema.ts         # Schema PostgreSQL (boolCol, withTimezone: true)
│   │   ├── schema.sqlite.ts  # Schema SQLite equivalente
│   │   └── sqlite-driver.ts  # Driver con fix de backslashes Windows
│   ├── demo/
│   │   ├── interceptor.ts    # Intercepta window.fetch para /api/* CRUD → localStorage
│   │   └── storage.ts        # CRUD completo en localStorage para modo demo
│   ├── auth.ts               # JWT/bcrypt personalizado (jose + bcryptjs)
│   ├── desktop.ts            # isTauriWebView(), openExternalUrl(), tauriInvoke()
│   ├── i18n.ts               # Internacionalización (es/en)
│   ├── platform-detection.ts # YouTube, Steam, GitHub, Spotify...
│   ├── responsive-layout.ts  # Breakpoints y columnas del bento grid (xs Y acumulativo)
│   ├── security/
│   │   └── ssrf-protection.ts
│   └── validations/
│       └── index.ts          # Esquemas Zod + validateRequest()
├── stores/                   # 8 stores Zustand (ver tabla arriba)
└── types/
    ├── widget.ts             # Definiciones de tipos de widgets
    └── widget-utils.ts       # Utilidades de widgets
```

---

## Esquema de base de datos

```
links              → URL bookmarks (platform, contentType, isFavorite, isRead, notes, reminderAt)
categories         → Carpetas organizativas (soft delete)
tags               → Etiquetas flexibles; único por (userId, name) (soft delete)
link_tags          → Tabla junction muchos-a-muchos
projects           → Workspaces para widgets; null = Home (soft delete)
widgets            → Configuraciones de widgets con layout (soft delete)
user_layouts       → Configuraciones JSON del bento grid
user_settings      → Preferencias: theme, viewMode, language, gridColumns, thumbnailSize...
user_backups       → Backups JSON (manual/auto/export)
custom_widget_types → Tipos de widgets personalizados generados por IA
```

Todas las entidades con soft delete usan `deletedAt timestamp`. Filtrar siempre con `.where(isNull(table.deletedAt))`.

---

## Compatibilidad con navegadores / Safari (WebKit)

### Regla crítica: APIs no estándar del navegador

**NUNCA** usar optional chaining (`?.`) para invocar APIs que pueden no estar declaradas como variables globales en algunos motores JavaScript. En JavaScriptCore (Safari/WebKit), si la variable no existe globalmente, el operador `?.` **no previene el `ReferenceError`** — el motor lanza el error antes de evaluar el operador.

**Ejemplo del bug que causó crash en Safari:**

```javascript
// ❌ INCORRECTO — falla en Safari/WebKit con ReferenceError
requestIdleCallback?.(() => { /* ... */ });

// ✅ CORRECTO — guard typeof antes de llamar
if (typeof requestIdleCallback === "function") {
  requestIdleCallback(() => { /* ... */ });
}
```

Esta regla aplica a **cualquier API no estándar** o con soporte parcial:
- `requestIdleCallback` — no disponible en Safari
- `scheduler.postTask` — soporte limitado
- Cualquier API experimental o de Chrome/Firefox solo

**Archivo afectado:** `src/components/layout/Sidebar.tsx` (fix aplicado en v0.3.18)

---

## Service Worker — versionado de caché

El archivo `public/sw.js` implementa una estrategia cache-first para los assets estáticos de Next.js (`/_next/static/*`). Esta caché puede servir código JavaScript obsoleto tras un despliegue si no se fuerza su purga.

**Regla:** Bumpar `STATIC_CACHE_NAME` y `API_CACHE_NAME` en `public/sw.js` en **cada release** que incluya cambios de código JavaScript.

```javascript
// public/sw.js — actualizar en cada release con cambios JS
const STATIC_CACHE_NAME = "stacklume-static-v6";  // ← incrementar
const API_CACHE_NAME = "stacklume-api-v6";         // ← incrementar
```

- Al cambiar el nombre de la caché, el Service Worker instalado detecta el cambio, activa el nuevo SW y purga las cachés antiguas automáticamente.
- **Versión actual:** `stacklume-static-v6` / `stacklume-api-v6`

---

## Layout responsive — breakpoints y grid

El módulo `src/lib/responsive-layout.ts` define los breakpoints y columnas del bento grid:

```typescript
const BREAKPOINTS = { lg: 1200, md: 996, sm: 768, xs: 480 };
const COLS       = { lg: 12,   md: 10,  sm: 6,   xs: 1   };
```

### Regla crítica — layout xs (móvil < 480px)

El layout para el breakpoint `xs` se calcula con **Y acumulativo**, no con el índice del array. Usar el índice (`y: idx`) produce solapamiento de widgets porque ignora las alturas reales, lo que provoca que `react-grid-layout` recalcule infinitamente → error "Maximum update depth exceeded".

```typescript
// ✅ CORRECTO — Y acumulativo
let xsCumulativeY = 0;
const xsLayout = widgets.map((item) => {
  const entry = { i: item.id, x: 0, y: xsCumulativeY, w: 1, h: item.h };
  xsCumulativeY += item.h;
  return entry;
});

// ❌ INCORRECTO — Y por índice (causa infinite loop)
const xsLayout = widgets.map((item, idx) => ({ i: item.id, x: 0, y: idx, w: 1, h: item.h }));
```

**Archivo:** `src/lib/responsive-layout.ts` (fix aplicado en v0.3.19)

---

## Seguridad

| Mecanismo | Descripción |
|-----------|-------------|
| **SSRF Protection** | `src/lib/security/ssrf-protection.ts` — bloquea IPs privadas en `/api/scrape` |
| **CSRF** | `src/lib/security/csrf.ts` — middleware en todas las rutas mutantes |
| **Rate Limiting** | Upstash Redis (opcional) — 1000 GET / 100 escrituras / 20 externas por minuto |
| **Input Validation** | Zod en todas las rutas via `validateRequest()` |
| **Auth bypass** | Solo en `DESKTOP_MODE=true` o `NODE_ENV !== 'production'` |
| **Iframe sandbox** | Custom widgets con `sandbox="allow-scripts"` sin `allow-same-origin` |

---

## Auto-updater (desktop)

`UpdateChecker.tsx` se monta en el layout solo cuando `isTauriWebView()` es `true`:

1. A los 6 segundos llama a GitHub API (`/repos/SwonDev/Stacklume/releases/latest`) via `fetch` desde el WebView
2. Compara versión con `NEXT_PUBLIC_APP_VERSION` (incrustada en build time)
3. Si hay versión nueva → muestra toast con botón "Actualizar"
4. Al confirmar: invoca el comando Rust `download_and_run_update` con la URL del instalador
5. Rust descarga el `.exe` a `%TEMP%\StacklumeUpdate.exe` via ureq (con `redirects(5)`)
6. Valida que sea ≥ 1 MB (evita páginas de error escritas como .exe)
7. Ejecuta el instalador; el hook NSIS cierra la app automáticamente

Los datos en `%APPDATA%\com.stacklume.app\stacklume.db` nunca se modifican durante la actualización.
