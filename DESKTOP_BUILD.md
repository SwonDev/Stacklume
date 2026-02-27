# Stacklume — Guía de build para escritorio (Tauri v2 + Windows)

Este documento describe cómo compilar el instalador `.exe` de Stacklume para Windows, la arquitectura del modo desktop, y todos los errores conocidos con sus soluciones.

---

## Arquitectura

```
Stacklume Desktop (Tauri v2 + WebView2)
├── Ventana nativa sin decoraciones OS
│   ├── TitleBar React personalizado (estilo macOS)
│   └── WebView apunta a http://127.0.0.1:{PORT}
├── Al arrancar (lib.rs):
│   ├── Busca puerto libre (3001–3005)
│   ├── Spawna node.exe + .next/standalone/server.js
│   │   ├── DESKTOP_MODE=true  → sin auth, sin CSRF
│   │   ├── DATABASE_PATH=%APPDATA%\com.stacklume.app\stacklume.db
│   │   └── NODE_ENV=production
│   ├── Espera health check en /api/health (timeout 40s)
│   └── Navega el WebView al servidor
└── Al cerrar: mata node.exe + termina proceso
```

**Base de datos:** SQLite en `%APPDATA%\com.stacklume.app\stacklume.db`
**Logs:** `%APPDATA%\com.stacklume.app\stacklume.log` y `server.log`

---

## Prerrequisitos

| Herramienta | Versión mínima | Comprobación |
|---|---|---|
| Node.js | ≥ 20 LTS | `node --version` |
| pnpm | ≥ 9 | `pnpm --version` |
| Rust + Cargo | stable | `rustc --version` |
| Visual C++ Build Tools | 2022 | Requerido por Rust |
| WebView2 Runtime | cualquiera | Preinstalado en Windows 11 |
| NSIS | 3.x | Instalado por Tauri automáticamente |

Instalar Rust: https://rustup.rs/

---

## Pasos de build

### 1. Instalar dependencias

```bash
pnpm install
```

### 2. Build completo de una sola vez

```bash
pnpm build:desktop   # Compila Next.js standalone + prepara recursos
pnpm tauri:build     # Compila Rust + genera instalador NSIS
```

El instalador queda en:
```
src-tauri/target/release/bundle/nsis/Stacklume_0.1.0_x64-setup.exe
```

### 3. Modo desarrollo (sin instalar)

```bash
pnpm tauri:dev
```

Arranca Next.js dev server + abre ventana Tauri apuntando a `localhost:3000`.

---

## Qué hace `build-desktop.mjs`

1. Ejecuta `next build` con `DESKTOP_MODE=true ELECTRON_BUILD=true`
2. Copia `.next/static` y `public/` al directorio standalone
3. Descarga `node-v22.x-win-x64.zip` si no existe en `./tmp/`
4. Extrae `node.exe` → `src-tauri/resources/node/node.exe`
5. Copia las DLLs de VC++ Runtime desde `System32` → `resources/node/`
6. Copia el build standalone → `src-tauri/resources/server/`
7. Aplana los paquetes de `.pnpm/` al nivel raíz (necesario por MAX\_PATH de NSIS)
8. Actualiza `tauri.conf.json` con `resources: ["resources/**/*"]`

---

## Variables de entorno en modo desktop

El servidor Next.js recibe automáticamente:

| Variable | Valor | Efecto |
|---|---|---|
| `DESKTOP_MODE` | `"true"` | Sin auth, sin CSRF, SQLite |
| `DATABASE_PATH` | ruta al `.db` | Abre o crea la base de datos |
| `PORT` | dinámico (3001+) | Puerto del servidor HTTP |
| `NODE_ENV` | `"production"` | Modo producción de Next.js |

---

## Errores conocidos y soluciones aplicadas

### 1. `@libsql/client` no abre la DB en Windows

**Síntoma:** Tablas vacías a pesar de que la DB existe con datos.
**Causa:** `file:C:\ruta\con\backslashes` — el driver no parsea las barras invertidas de Windows.
**Fix en** `src/lib/db/sqlite-driver.ts`:
```ts
const dbPath = rawPath.replace(/\\/g, "/");
const client = createClient({ url: `file:${dbPath}` });
```

---

### 2. `createdAt: null` en todas las respuestas de la API

**Síntoma:** Todos los campos timestamp devuelven `null`.
**Causa:** `drizzle-orm` 0.45.x — `PgTimestamp.mapFromDriverValue` con `withTimezone=false` hace `new Date(value + "+0000")`. Cuando el valor ya tiene sufijo `Z` (ISO 8601), el resultado es `"...Z+0000"` → Invalid Date → `JSON.stringify` → `null`.
**Fix en** `src/lib/db/schema.ts`: añadir `{ withTimezone: true }` a **todos** los campos `timestamp()`:
```ts
// ANTES (rompe SQLite):
timestamp("created_at").defaultNow().notNull()

// DESPUÉS (funciona en ambos):
timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
```

---

### 3. Booleanos devueltos como `0` / `1` en lugar de `true` / `false`

**Síntoma:** `"isFavorite": 0`, `"showTooltips": 1` — SQLite guarda booleans como enteros.
**Causa:** `PgBoolean` en Drizzle 0.45.x no tiene `mapFromDriverValue`, por lo que el `0`/`1` de SQLite llega tal cual al JSON.
**Fix en** `src/lib/db/schema.ts` — tipo personalizado con `customType`:
```ts
import { customType } from "drizzle-orm/pg-core";

const boolCol = customType<{ data: boolean; driverData: boolean | number }>({
  dataType() { return "boolean"; },
  fromDriver(value) { return Boolean(value); },
});

// Uso (sustituye boolean() en todas las columnas boolean):
isFavorite: boolCol("is_favorite").default(false),
showTooltips: boolCol("show_tooltips").default(true).notNull(),
```

---

### 4. Los botones de la TitleBar (minimizar/maximizar/cerrar) no funcionan

**Síntoma:** Clic en los botones no hace nada.
**Causa:** En Tauri v2, `window.__TAURI__` **no se inyecta automáticamente**. El código usaba `window.__TAURI__?.invoke(...)` que era `undefined`.
**Fix — dos partes:**

**A)** En `src-tauri/tauri.conf.json`, sección `app`:
```json
{
  "app": {
    "withGlobalTauri": true,
    "security": { "csp": null }
  }
}
```
Esto hace que Tauri inyecte `window.__TAURI__` en el WebView.

**B)** En `src/lib/desktop.ts`, función `tauriInvoke` con doble fallback:
```ts
function tauriInvoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  if (window.__TAURI_INTERNALS__) return window.__TAURI_INTERNALS__.invoke<T>(cmd, args);
  if (window.__TAURI__)           return window.__TAURI__.invoke<T>(cmd, args);
  return Promise.reject(new Error("[Desktop] Tauri API no disponible"));
}
```

---

### 5. La TitleBar y el botón logout no se ocultan / no se detecta entorno Tauri

**Síntoma:** El botón de cerrar sesión aparece en la app desktop. La TitleBar personalizada no se renderiza.
**Causa:** `isTauriWebView()` dependía de `window.__TAURI__` que no existía (ver error #4). Además, `useEffect` corre tarde (después del primer paint), causando un flash.
**Fix en** `src/app/layout.tsx` — inyectar flag antes de React:
```tsx
{process.env.DESKTOP_MODE === "true" && (
  <script dangerouslySetInnerHTML={{ __html: "window.__DESKTOP_MODE__=true;" }} />
)}
```
**Fix en** `src/hooks/useElectron.ts` — usar `useLayoutEffect` (antes del paint):
```ts
// ANTES (flash visible):
useEffect(() => { ... requestAnimationFrame(() => { setIsTauri(isTauriWebView()); }); }, []);

// DESPUÉS (sin flash):
useLayoutEffect(() => { setIsTauri(isTauriWebView()); }, []);
```

---

### 6. Error "Cannot find module" al iniciar la app instalada

**Síntoma:** La ventana muestra un error con stack trace de Node.js al arrancar.
**Causa:** Next.js standalone usa `require()` para paquetes como `styled-jsx`. En el standalone, estos quedan en `.pnpm/` con rutas simbólicas que no se copian bien.
**Fix en** `scripts/build-desktop.mjs`: aplanar todos los paquetes de `.pnpm/` al nivel raíz de `node_modules/` antes de copiar al bundle Tauri.

---

### 7. node.exe bloqueado al reinstalar / actualizar

**Síntoma:** El instalador falla diciendo que `node.exe` está en uso.
**Causa:** `std::mem::forget(child)` dejaba el proceso huérfano corriendo al cerrar la ventana Tauri.
**Fix en** `src-tauri/src/lib.rs`: guardar el `Child` en `ServerState` y matarlo en `on_window_event(Destroyed)`:
```rust
struct ServerState {
    port: Mutex<u16>,
    node_child: Mutex<Option<std::process::Child>>,
}
// En on_window_event:
WindowEvent::Destroyed => {
    let maybe_child = state.node_child.lock().ok().and_then(|mut g| g.take());
    drop(state);
    if let Some(mut child) = maybe_child { let _ = child.kill(); let _ = child.wait(); }
}
```

---

### 8. Límite MAX\_PATH de Windows (260 chars) rompe NSIS

**Síntoma:** `makensis` falla con error de ruta demasiado larga.
**Causa:** `.pnpm/` genera rutas muy profundas incompatibles con el límite MAX\_PATH de Windows en NSIS.
**Fix:** Eliminar el directorio `.pnpm/` del standalone antes de empaquetar. El paso anterior (fix #6) ya habrá copiado todo al nivel raíz.

---

### 9. `ilike` no está soportado en SQLite

**Síntoma:** Error SQL al buscar links en modo desktop.
**Causa:** `ilike` es una función específica de PostgreSQL.
**Fix en** `src/app/api/links/route.ts` y `search/route.ts`:
```ts
// ANTES (solo PostgreSQL):
ilike(links.title, `%${q}%`)

// DESPUÉS (compatible con ambos):
like(sql`LOWER(${links.title})`, `%${q.toLowerCase()}%`)
```

---

### 10. SQLite no genera UUIDs automáticamente

**Síntoma:** Error de constraint al insertar registros (campo `id` nulo).
**Causa:** `uuid().primaryKey().defaultRandom()` solo funciona en PostgreSQL.
**Fix:** Añadir `generateId()` explícitamente en todos los inserts:
```ts
import { generateId } from "@/lib/db";
// En el insert:
db.insert(table).values({ id: generateId(), ...resto })
```

---

### 11. vcruntime140.dll no encontrado en Windows sin VC++ Redistributable

**Síntoma:** La app instalada no arranca en PCs sin Visual C++ Redistributable.
**Fix en** `scripts/build-desktop.mjs`: copiar las DLLs desde `C:\Windows\System32`:
```js
const dlls = ["vcruntime140.dll", "vcruntime140_1.dll", "msvcp140.dll"];
for (const dll of dlls) {
  fs.copyFileSync(`C:/Windows/System32/${dll}`, `src-tauri/resources/node/${dll}`);
}
```

---

## Estructura de archivos importantes

```
STACKLUME/
├── scripts/
│   ├── build-desktop.mjs       ← Pipeline de build completo
│   └── generate-nsis-assets.mjs ← Genera BMP para el instalador NSIS
├── src-tauri/
│   ├── src/
│   │   ├── main.rs             ← Entry point (sin lógica)
│   │   └── lib.rs              ← Toda la lógica Rust
│   ├── tauri.conf.json         ← Configuración Tauri (withGlobalTauri: true)
│   ├── Cargo.toml              ← Dependencias Rust
│   ├── capabilities/
│   │   └── default.json        ← Permisos del WebView
│   ├── icons/                  ← Iconos generados (pnpm tauri icon)
│   ├── nsis/
│   │   ├── header.bmp          ← Imagen header del instalador (150×57)
│   │   └── sidebar.bmp         ← Imagen sidebar del instalador (164×314)
│   └── resources/              ← ¡GENERADO! No commitear
│       ├── node/               ← node.exe + DLLs (92MB)
│       └── server/             ← Next.js standalone (99MB)
├── src/
│   ├── app/layout.tsx          ← Script DESKTOP_MODE injection
│   ├── components/desktop/
│   │   └── TitleBar.tsx        ← TitleBar macOS-style
│   ├── hooks/useElectron.ts    ← Detección de entorno desktop
│   ├── lib/
│   │   ├── desktop.ts          ← tauriInvoke + isTauriWebView
│   │   └── db/
│   │       ├── schema.ts       ← withTimezone: true + boolCol
│   │       ├── schema.sqlite.ts ← Schema equivalente para SQLite
│   │       ├── sqlite-driver.ts ← Driver libsql con fix de backslashes
│   │       └── init-desktop.ts  ← Inicialización DB en startup
│   ├── proxy.ts                ← (era middleware.ts) bypass en DESKTOP_MODE
│   └── types/electron.d.ts     ← __TAURI__, __TAURI_INTERNALS__, __DESKTOP_MODE__
├── dist-placeholder/
│   └── index.html              ← HTML vacío (requerido por tauri.conf.json)
└── drizzle.sqlite.config.ts    ← Config Drizzle para SQLite
```

---

## Scripts disponibles

```bash
pnpm tauri:dev          # Desarrollo: Next.js dev + ventana Tauri
pnpm build:desktop      # Build Next.js standalone para desktop
pnpm tauri:build        # Compilar Rust + generar instalador NSIS
pnpm db:sqlite:generate # Generar migraciones SQLite desde schema.sqlite.ts
pnpm db:sqlite:migrate  # Aplicar migraciones SQLite
```

---

## Regenerar iconos

```bash
pnpm tauri icon public/logo.svg
# Genera src-tauri/icons/ automáticamente
```

---

## Diagnóstico en producción

Si la app no arranca o da error, revisar:

1. `%APPDATA%\com.stacklume.app\stacklume.log` — log del proceso Rust (puertos, rutas, PIDs)
2. `%APPDATA%\com.stacklume.app\server.log` — stdout/stderr del servidor Next.js
3. Si el timeout expira (40s), la ventana muestra las últimas líneas de `server.log`

---

## Checklist antes de publicar una nueva versión

- [ ] `pnpm tsc --noEmit` sin errores
- [ ] `pnpm build:desktop` completa sin errores
- [ ] `pnpm tauri:build` genera el `.exe`
- [ ] Instalar el `.exe` en una máquina limpia (sin VC++ Redistributable instalado)
- [ ] Ventana abre directamente al dashboard (sin pantalla de login)
- [ ] TitleBar visible: botones close/minimize/maximize funcionan
- [ ] Sin botón de "cerrar sesión" en el header
- [ ] Añadir link, crear categoría, añadir widget → datos persisten al reiniciar
- [ ] Desinstalar y volver a instalar → datos permanecen en `%APPDATA%`
