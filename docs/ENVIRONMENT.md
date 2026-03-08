# Variables de entorno — Referencia

> La versión **desktop** no requiere ninguna variable de entorno manual — el binario Tauri las configura automáticamente al arrancar.

---

## Variables requeridas (versión web)

### Base de datos

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `DATABASE_URL` | Connection string Neon PostgreSQL | `postgresql://user:pass@ep-xxx.us-east-1.aws.neon.tech/db?sslmode=require` |

### Autenticación

Stacklume usa un sistema propio de JWT + bcrypt (no NextAuth ni OAuth).

| Variable | Descripción | Cómo generarla |
|----------|-------------|----------------|
| `AUTH_USERNAME` | Nombre de usuario para el login | Elige uno libremente |
| `AUTH_PASSWORD_HASH` | Hash bcrypt de la contraseña | `node -e "require('bcryptjs').hash('tu-pass',10).then(console.log)"` |
| `AUTH_SECRET` | Clave para firmar los JWT (mín. 32 chars) | `openssl rand -base64 32` |

---

## Variables opcionales (versión web)

### Rate limiting (Upstash Redis)

Si no se configuran, el rate limiting queda desactivado.

| Variable | Descripción |
|----------|-------------|
| `UPSTASH_REDIS_REST_URL` | URL REST de tu base de datos Upstash Redis |
| `UPSTASH_REDIS_REST_TOKEN` | Token de acceso Upstash Redis |

### Error monitoring (Sentry)

| Variable | Descripción |
|----------|-------------|
| `SENTRY_DSN` | Data Source Name del proyecto Sentry |
| `SENTRY_AUTH_TOKEN` | Token para subir source maps (opcional) |
| `SENTRY_ORG` | Slug de organización Sentry (opcional) |
| `SENTRY_PROJECT` | Slug del proyecto Sentry (opcional) |

### GitHub (widgets de GitHub Trending / Search)

| Variable | Descripción | Default |
|----------|-------------|---------|
| `GITHUB_TOKEN` | Token de GitHub con scope `public_repo` | Sin token: límite 60 req/hora |

### Build / versión

| Variable | Descripción |
|----------|-------------|
| `NEXT_PUBLIC_APP_VERSION` | Versión mostrada en la UI y usada por el auto-updater |

---

## Variables desktop (gestionadas automáticamente)

Estas las configura el binario Rust al arrancar — no tocar manualmente.

| Variable | Valor | Efecto |
|----------|-------|--------|
| `DESKTOP_MODE` | `"true"` | Desactiva auth, CSRF. Activa SQLite |
| `DATABASE_PATH` | `%APPDATA%\com.stacklume.app\stacklume.db` | Ruta a la base de datos SQLite |
| `PORT` | dinámico (preferencia 7879) | Puerto del servidor HTTP local |
| `HOSTNAME` | `127.0.0.1` | El servidor solo escucha localmente |
| `NODE_ENV` | `"production"` | Activa modo producción de Next.js |

Claves privadas para el auto-updater (solo relevantes para releases):

| Variable | Dónde va | Descripción |
|----------|----------|-------------|
| `TAURI_SIGNING_PRIVATE_KEY` | `.env.local` | Clave privada minisign en base64 |
| `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` | `.env.local` | Contraseña de la clave privada |

---

## Ejemplo de `.env.local` completo

```env
# ─── Requerido ─────────────────────────────────────────────────────────
DATABASE_URL="postgresql://user:password@ep-xxx.us-east-1.aws.neon.tech/stacklume?sslmode=require"

AUTH_USERNAME="admin"
AUTH_PASSWORD_HASH="$2b$10$xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
AUTH_SECRET="clave-aleatoria-de-al-menos-32-caracteres"

# ─── Opcional ──────────────────────────────────────────────────────────
UPSTASH_REDIS_REST_URL="https://xxx.upstash.io"
UPSTASH_REDIS_REST_TOKEN="xxx"

SENTRY_DSN="https://xxx@xxx.ingest.sentry.io/xxx"
SENTRY_AUTH_TOKEN="xxx"

GITHUB_TOKEN="ghp_xxx"

NEXT_PUBLIC_APP_VERSION="0.3.21"

# ─── Solo para publicar releases desktop ──────────────────────────────
TAURI_SIGNING_PRIVATE_KEY="base64keyhere..."
TAURI_SIGNING_PRIVATE_KEY_PASSWORD="tu-contraseña-de-clave"
```

---

## Seguridad

- Nunca commitear `.env` o `.env.local` al repositorio (están en `.gitignore`)
- Usa variables de entorno cifradas en tu plataforma de deploy (Vercel, Railway...)
- `AUTH_SECRET` debe ser diferente entre desarrollo y producción
- Los hashes bcrypt nunca contienen la contraseña — son seguros para revisar si se filtran
