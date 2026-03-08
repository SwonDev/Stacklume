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
│   ├── Busca puerto libre (intenta 7879 primero)
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

### 2. Build completo + firma + subida automática a GitHub

```bash
pnpm tauri:build
```

Este único comando hace todo el pipeline:
1. Carga `TAURI_SIGNING_PRIVATE_KEY` y `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` desde `.env.local`
2. Ejecuta `pnpm build:desktop` (Next.js standalone + recursos)
3. Compila el binario Rust y genera el instalador NSIS
4. Firma el `.exe` con la clave minisign privada → genera `.exe.sig`
5. Genera `update-manifest.json` con versión, URL y firma
6. Sube los 3 archivos a la GitHub release del tag actual (con `--clobber`)

El instalador queda en:
```
src-tauri/target/release/bundle/nsis/Stacklume_x.x.x_x64-setup.exe
```

### 3. Solo compilar Next.js + recursos (sin Rust)

```bash
pnpm build:desktop
```

Útil cuando solo hay cambios en frontend y quieres reusar el binario Rust previo.

### 4. Modo desarrollo (sin instalar)

```bash
pnpm tauri:dev
```

Arranca Next.js dev server en el **puerto 7878** con `DESKTOP_MODE=true` (SQLite, sin auth) + abre ventana Tauri apuntando a `localhost:7878`. La primera compilación Rust tarda ~2 minutos; las siguientes ~10 segundos.

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

### 7. node.exe bloqueado al cerrar la ventana (cierre limpio)

**Síntoma:** Al reinstalar después de usar la app, el instalador a veces falla porque `node.exe` sigue corriendo.
**Causa:** `std::mem::forget(child)` dejaba el proceso huérfano al cerrar la ventana Tauri.
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

### 8. NSIS falla con "Error abriendo archivo para escritura: node.exe" al reinstalar sobre app en ejecución

**Síntoma:** Durante la instalación aparece el error "Error abriendo archivo para escritura: C:\...\resources\node\node.exe". El instalador aborta.
**Causa:** Si Stacklume está abierto (o si crasheó sin limpiar su proceso hijo), `node.exe` sigue corriendo y bloqueando el archivo. NSIS intenta sobreescribirlo y falla.
**Fix:** Añadir hooks NSIS que matan los procesos antes de copiar archivos:

**A)** Crear `src-tauri/nsis/installer-hooks.nsh`:
```nsis
!macro NSIS_HOOK_PREINSTALL
  nsExec::Exec 'taskkill /F /IM stacklume.exe /T'
  nsExec::Exec 'powershell -WindowStyle Hidden -Command "Get-Process node -ErrorAction SilentlyContinue | Where-Object { $_.Path -like ''*\Stacklume\*'' } | Stop-Process -Force"'
  Sleep 1500
!macroend

!macro NSIS_HOOK_POSTINSTALL
!macroend

!macro NSIS_HOOK_PREUNINSTALL
  nsExec::Exec 'taskkill /F /IM stacklume.exe /T'
  nsExec::Exec 'powershell -WindowStyle Hidden -Command "Get-Process node -ErrorAction SilentlyContinue | Where-Object { $_.Path -like ''*\Stacklume\*'' } | Stop-Process -Force"'
  Sleep 1000
!macroend

!macro NSIS_HOOK_POSTUNINSTALL
!macroend
```

**B)** Referenciar el archivo en `src-tauri/tauri.conf.json`:
```json
{
  "bundle": {
    "windows": {
      "nsis": {
        "installerHooks": "nsis/installer-hooks.nsh"
      }
    }
  }
}
```

La macro `NSIS_HOOK_PREINSTALL` se ejecuta **antes** de que NSIS empiece a copiar archivos. El flag `/T` de `taskkill` mata también el árbol de procesos hijos (node.exe incluido).

---

### 9. Límite MAX\_PATH de Windows (260 chars) rompe NSIS

**Síntoma:** `makensis` falla con error de ruta demasiado larga.
**Causa:** `.pnpm/` genera rutas muy profundas incompatibles con el límite MAX\_PATH de Windows en NSIS.
**Fix:** Eliminar el directorio `.pnpm/` del standalone antes de empaquetar. El paso anterior (fix #6) ya habrá copiado todo al nivel raíz.

---

### 10. `ilike` no está soportado en SQLite

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

### 11. SQLite no genera UUIDs automáticamente

**Síntoma:** Error de constraint al insertar registros (campo `id` nulo).
**Causa:** `uuid().primaryKey().defaultRandom()` solo funciona en PostgreSQL.
**Fix:** Añadir `generateId()` explícitamente en todos los inserts:
```ts
import { generateId } from "@/lib/db";
// En el insert:
db.insert(table).values({ id: generateId(), ...resto })
```

---

### 12. vcruntime140.dll no encontrado en Windows sin VC++ Redistributable

**Síntoma:** La app instalada no arranca en PCs sin Visual C++ Redistributable.
**Fix en** `scripts/build-desktop.mjs`: copiar las DLLs desde `C:\Windows\System32`:
```js
const dlls = ["vcruntime140.dll", "vcruntime140_1.dll", "msvcp140.dll"];
for (const dll of dlls) {
  fs.copyFileSync(`C:/Windows/System32/${dll}`, `src-tauri/resources/node/${dll}`);
}
```

---

### 13. La app no arranca tras instalar — `unknown variant 'currentUser'`

**Síntoma:** La ventana no aparece. El proceso muere silenciosamente al arrancar. Si se ejecuta `stacklume.exe` desde la terminal se ve:
```
panicked at ... PluginInitialization("updater", "Error deserializing 'plugins.updater' within your Tauri configuration: unknown variant `currentUser`, expected one of `basicUi`, `quiet`, `passive`")
```
**Causa:** En `tauri.conf.json` hay **dos** secciones con `installMode` y sus valores válidos son distintos. Es fácil confundirlos:

| Sección | Valores válidos |
|---------|----------------|
| `bundle.windows.nsis.installMode` | `currentUser` · `perMachine` |
| `plugins.updater.windows.installMode` | `basicUi` · `quiet` · `passive` |

**Fix en** `src-tauri/tauri.conf.json`:
```json
{
  "plugins": {
    "updater": {
      "windows": {
        "installMode": "passive"
      }
    }
  },
  "bundle": {
    "windows": {
      "nsis": {
        "installMode": "currentUser"
      }
    }
  }
}
```

> Los logs de `%APPDATA%\com.stacklume.app\stacklume.log` estarán **vacíos** porque el panic ocurre antes de que lib.rs llegue a crear el archivo de log. Para diagnosticarlo hay que ejecutar `stacklume.exe` desde un terminal.

---

### 14. `pnpm tauri:build` falla en la firma con "Error al firmar: undefined"

**Síntoma:** El build compila y genera el instalador correctamente, pero al llegar al paso de firma muestra:
```
[build-release] ✗ Error al firmar: undefined
```
El proceso termina con código de salida 1. No se genera el `.sig` ni el `update-manifest.json`. Los assets no se suben a GitHub.

**Causa:** `spawnSync("pnpm", [...])` en `scripts/build-release.mjs` falla con `ENOENT` en Windows porque `pnpm` es un archivo `.cmd`, no un ejecutable nativo. `spawnSync` sin `shell: true` no puede encontrar archivos `.cmd`/`.bat`. Cuando `spawnSync` lanza un `ENOENT`, `result.stderr` y `result.stdout` son `undefined`, de ahí el mensaje confuso.

**Síntoma secundario que enmascara el error:** Si existe un `.sig` de un build anterior con el mismo nombre (p.ej., tras un build parcialmente exitoso), la condición `if (!existsSync(sigPath))` es `false` y el paso de firma se salta. El problema solo se manifiesta en builds limpios.

**Fix en** `scripts/build-release.mjs` — añadir `shell: true`:
```js
// ANTES (falla en Windows):
const result = spawnSync("pnpm", ["exec", "tauri", "signer", "sign", ...args], {
  encoding: "utf8", cwd: ROOT, stdio: "pipe"
});

// DESPUÉS (funciona):
const result = spawnSync("pnpm", ["exec", "tauri", "signer", "sign", ...args], {
  encoding: "utf8", cwd: ROOT, stdio: "pipe", shell: true
});
```

**Para firmar manualmente sin recompilar todo** (útil si el instalador ya existe):
```bash
# Leer variables del .env.local y firmar directamente
SIGNING_KEY=$(grep "^TAURI_SIGNING_PRIVATE_KEY=" .env.local | cut -d= -f2-)
SIGNING_PASS=$(grep "^TAURI_SIGNING_PRIVATE_KEY_PASSWORD=" .env.local | cut -d= -f2-)
pnpm exec tauri signer sign -k "$SIGNING_KEY" -p "$SIGNING_PASS" \
  "src-tauri/target/release/bundle/nsis/Stacklume_X.Y.Z_x64-setup.exe"
```

---

## Estructura de archivos importantes

```
STACKLUME/
├── scripts/
│   ├── build-desktop.mjs       ← Next.js standalone + node.exe + DLLs
│   ├── build-release.mjs       ← Pipeline completo: compilar + firmar + subir a GitHub
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
│   │   ├── sidebar.bmp         ← Imagen sidebar del instalador (164×314)
│   │   └── installer-hooks.nsh ← Mata procesos antes de instalar/desinstalar (error #8)
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
pnpm tauri:build        # Build completo: compilar + firmar + subir a GitHub release
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

## Auto-updater

La app comprueba actualizaciones al arrancar y permite instalarlas sin cerrar la app manualmente.

### Cómo funciona

1. `UpdateChecker.tsx` se monta en el layout solo cuando `isTauriWebView()` es `true`
2. A los 6 segundos llama a **GitHub API** (`/repos/SwonDev/Stacklume/releases/latest`) via `fetch` desde el WebView
3. Compara la versión del release con `NEXT_PUBLIC_APP_VERSION` (incrustada en build time)
4. Si hay versión nueva → toast con botón "Actualizar"
5. Al confirmar: invoca el comando Rust **`download_and_run_update`** con la URL del instalador
6. Rust descarga el `.exe` a `%TEMP%\StacklumeUpdate.exe` via **ureq** (con `redirects(5)`)
7. Valida que el archivo sea ≥ 1 MB (descarta páginas de error escritas como .exe)
8. Ejecuta el instalador; el hook NSIS mata Stacklume y reemplaza los archivos

Los datos en `%APPDATA%\com.stacklume.app\stacklume.db` nunca se modifican durante la actualización.

> **Nota:** Este sistema usa un comando Rust propio (`download_and_run_update`), **no** `tauri-plugin-updater`. El plugin de updater y el plugin de process no están en el proyecto.

### Archivos involucrados

| Archivo | Rol |
|---------|-----|
| `src/components/desktop/UpdateChecker.tsx` | Toast UI + comprobación via GitHub API + botón Actualizar |
| `src-tauri/src/lib.rs` → `download_and_run_update` | Descarga via ureq + validación + spawn del instalador |
| `scripts/build-release.mjs` | Firma el `.exe` y genera `update-manifest.json` |

### Claves de firma (para el instalador, no para el updater)

El instalador `.exe` está firmado con **minisign** para que el manifiesto sea verificable.

- **Clave pública** → embebida en `tauri.conf.json` (`bundle.windows.nsis`). Segura para commitear.
- **Clave privada** → en `.env.local` como `TAURI_SIGNING_PRIVATE_KEY` (base64). **Nunca commitear.**
- **Contraseña** → en `.env.local` como `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`. **Nunca commitear.**

Para regenerar el par de claves (solo si se pierde la privada):
```bash
pnpm exec tauri signer generate -w my-signing-key.key
# Copiar la clave pública generada donde corresponda
# Actualizar .env.local con la nueva clave privada y contraseña
```

### Publicar una nueva versión

```bash
# 1. Actualizar versión en los 3 ficheros:
#    package.json → "version": "X.Y.Z"
#    src-tauri/tauri.conf.json → "version": "X.Y.Z"
#    src-tauri/Cargo.toml → version = "X.Y.Z"

# 2. Commit + push
git add package.json src-tauri/tauri.conf.json src-tauri/Cargo.toml
git commit -m "feat(vX.Y.Z): descripción de los cambios"
git push origin main

# 3. Build completo (compila + firma + genera update-manifest.json)
pnpm tauri:build

# 4. El script mostrará el comando gh release create si la release no existe:
gh release create vX.Y.Z \
  "src-tauri/target/release/bundle/nsis/Stacklume_X.Y.Z_x64-setup.exe#Stacklume_X.Y.Z_x64-setup.exe" \
  "src-tauri/target/release/bundle/nsis/Stacklume_X.Y.Z_x64-setup.exe.sig#Stacklume_X.Y.Z_x64-setup.exe.sig" \
  "src-tauri/target/release/bundle/nsis/update-manifest.json#update-manifest.json" \
  --title "Stacklume vX.Y.Z" --notes "Descripción..."
```

Los 3 assets subidos a cada release son:
- `Stacklume_X.Y.Z_x64-setup.exe` — instalador firmado
- `Stacklume_X.Y.Z_x64-setup.exe.sig` — firma minisign
- `update-manifest.json` — manifiesto de actualización

### update-manifest.json

```json
{
  "version": "0.3.21",
  "notes": "Stacklume v0.3.21",
  "pub_date": "2026-03-08T12:00:00.000Z",
  "platforms": {
    "windows-x86_64": {
      "url": "https://github.com/SwonDev/Stacklume/releases/download/v0.3.21/Stacklume_0.3.21_x64-setup.exe",
      "signature": "<firma minisign base64>"
    }
  }
}
```

---

## Checklist antes de publicar una nueva versión

**Preparación:**
- [ ] Versión actualizada en `package.json`, `tauri.conf.json` y `Cargo.toml`
- [ ] `pnpm tsc --noEmit` → 0 errores (ignorar `.next/types/` si no está buildeado)
- [ ] `pnpm lint` → 0 errores
- [ ] Commit y push a `main`
- [ ] Cuenta GitHub correcta: `gh auth switch --user SwonDev`

**Build:**
- [ ] `pnpm tauri:build` completa sin errores
- [ ] Log muestra "✓ update-manifest.json generado"
- [ ] Los 3 assets subidos a GitHub release: `.exe`, `.exe.sig`, `update-manifest.json`

**Verificación funcional:**
- [ ] Instalar el `.exe` en una máquina limpia (sin VC++ Redistributable instalado)
- [ ] Ventana abre directamente al dashboard (sin pantalla de login)
- [ ] TitleBar visible: botones close/minimize/maximize funcionan
- [ ] Sin botón de "cerrar sesión" en el header
- [ ] Los widgets del Bento se cargan correctamente al arrancar (sin tener que cambiar de vista)
- [ ] Añadir link, crear categoría, añadir widget → datos persisten al reiniciar
- [ ] Desinstalar y volver a instalar → datos permanecen en `%APPDATA%`
- [ ] **Con la app abierta**, ejecutar el instalador de nuevo → se instala sin error de "archivo en uso"

**Verificación del auto-updater:**
- [ ] Instalar la versión anterior (`vX.Y.(Z-1)`)
- [ ] Abrir la app → en ~6 segundos aparece toast "Nueva versión disponible"
- [ ] Pulsar "Actualizar" → descarga en segundo plano → instalador se ejecuta → app se cierra y relanza
- [ ] Datos intactos tras la actualización automática
