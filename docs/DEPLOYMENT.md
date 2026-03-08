# Stacklume — Guía de despliegue

Stacklume puede usarse como aplicación de escritorio Windows (recomendado para uso personal) o como web app self-hosted.

---

## Opción A — App de escritorio para Windows (más sencilla)

No requiere servidor, base de datos externa ni configuración.

1. Descarga el instalador desde [GitHub Releases](https://github.com/SwonDev/Stacklume/releases/latest): `Stacklume_x.x.x_x64-setup.exe`
2. Ejecuta el instalador (no requiere Node.js ni Visual C++ Redistributable)
3. Abre Stacklume — el dashboard aparece directamente, sin pantalla de login

Los datos se guardan en `%APPDATA%\com.stacklume.app\stacklume.db` (SQLite).

> Para compilar el instalador desde el código fuente, consulta [DESKTOP_BUILD.md](../DESKTOP_BUILD.md).

---

## Opción B — Web app self-hosted (Vercel recomendado)

### Prerrequisitos

- Node.js ≥ 20 LTS
- pnpm ≥ 9
- Base de datos **Neon PostgreSQL** (plan gratuito disponible en [neon.tech](https://neon.tech))

### 1. Clonar el repositorio

```bash
git clone https://github.com/SwonDev/Stacklume.git
cd Stacklume
pnpm install
```

### 2. Configurar variables de entorno

Crea `.env.local` con el siguiente contenido:

```env
# Requerido — Neon PostgreSQL
DATABASE_URL="postgresql://usuario:password@ep-xxx.us-east-1.aws.neon.tech/stacklume?sslmode=require"

# Requerido — Autenticación (usuario y contraseña únicos)
AUTH_USERNAME="tu-usuario"
AUTH_PASSWORD_HASH=""      # generar abajo
AUTH_SECRET=""             # generar abajo

# Opcional — Rate limiting (Upstash Redis)
UPSTASH_REDIS_REST_URL=""
UPSTASH_REDIS_REST_TOKEN=""

# Opcional — Error monitoring (Sentry)
SENTRY_DSN=""
SENTRY_AUTH_TOKEN=""
```

**Generar `AUTH_PASSWORD_HASH`:**
```bash
node -e "require('bcryptjs').hash('tu-contraseña', 10).then(console.log)"
```

**Generar `AUTH_SECRET`:**
```bash
openssl rand -base64 32
```

### 3. Inicializar la base de datos

```bash
pnpm db:push
```

### 4. Modo desarrollo

```bash
pnpm dev
# → http://localhost:3000
```

### 5. Build de producción

```bash
pnpm build
pnpm start
```

---

## Despliegue en Vercel

1. Haz fork del repositorio en tu cuenta GitHub
2. Importa el proyecto en [vercel.com](https://vercel.com)
3. Añade las variables de entorno en los ajustes del proyecto (mismas que `.env.local`)
4. Haz deploy — Vercel detecta automáticamente Next.js

> **Nota sobre Vercel CI:** Si el deploy falla en "Deploying outputs...", usa el workaround:
> ```bash
> pnpm build && npx vercel build --prod && npx vercel deploy --prebuilt --prod
> ```

---

## Variables de entorno — Referencia completa

### Versión web

| Variable | Obligatoria | Descripción |
|----------|------------|-------------|
| `DATABASE_URL` | ✅ | Connection string Neon PostgreSQL |
| `AUTH_USERNAME` | ✅ prod | Nombre de usuario para el login |
| `AUTH_PASSWORD_HASH` | ✅ prod | Hash bcrypt de la contraseña |
| `AUTH_SECRET` | ✅ prod | Clave para firmar JWT (mín. 32 chars) |
| `UPSTASH_REDIS_REST_URL` | ⬜ | URL REST de Upstash Redis (rate limiting) |
| `UPSTASH_REDIS_REST_TOKEN` | ⬜ | Token Upstash Redis |
| `SENTRY_DSN` | ⬜ | DSN de Sentry para error monitoring |
| `SENTRY_AUTH_TOKEN` | ⬜ | Token Sentry para source maps |
| `GITHUB_TOKEN` | ⬜ | Token GitHub (aumenta rate limit en widgets de GitHub) |
| `NEXT_PUBLIC_APP_VERSION` | ⬜ | Versión mostrada en la app (ej. `0.3.21`) |

### Modo desktop (gestionadas automáticamente por Rust/scripts)

| Variable | Valor | Efecto |
|----------|-------|--------|
| `DESKTOP_MODE` | `"true"` | Sin auth, sin CSRF, usa SQLite |
| `DATABASE_PATH` | ruta al `.db` | Ruta a `stacklume.db` en `%APPDATA%` |
| `PORT` | dinámico (≥7879) | Puerto del servidor HTTP local |
| `HOSTNAME` | `127.0.0.1` | Servidor solo escucha localmente |
| `NODE_ENV` | `"production"` | Modo producción de Next.js |

> La versión desktop no requiere ninguna variable de entorno manual. Todo lo configura el binario Tauri al arrancar.

---

## Actualización de la versión web

```bash
git pull origin main
pnpm install
pnpm db:push        # si hay cambios de schema
pnpm build
# Redeployar en Vercel o reiniciar el servidor
```

---

## Resolución de problemas

### La página de login no acepta las credenciales
- Verifica que `AUTH_PASSWORD_HASH` es un hash bcrypt válido (empieza por `$2b$`)
- El hash debe corresponder a la contraseña con la que intentas acceder
- `AUTH_USERNAME` debe coincidir exactamente (sensible a mayúsculas)

### Error de conexión a la base de datos
- Comprueba que `DATABASE_URL` incluye `?sslmode=require`
- Verifica que la IP de tu servidor está en la allowlist de Neon
- Prueba la conexión directamente: `pnpm db:studio`

### Rate limiting activo sin Upstash configurado
- Sin `UPSTASH_REDIS_REST_URL`, el rate limiting está desactivado
- Si se activa incorrectamente, revisa `src/lib/rate-limit.ts`

### Widgets no se cargan (modo web)
- Comprueba la consola del navegador para errores de API
- Verifica que `DATABASE_URL` es accesible desde el servidor Next.js

---

## Soporte

- [Abrir un issue en GitHub](https://github.com/SwonDev/Stacklume/issues)
- [Arquitectura técnica](./ARCHITECTURE.md)
- [Guía de build desktop](../DESKTOP_BUILD.md)
