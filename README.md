<div align="center">

<!-- Logo -->
<img src="assets/logo.svg" alt="Stacklume Logo" width="120" height="120" />

<br />
<br />

# ✨ Stacklume

### **Tu universo de links, bellamente organizado**

<br />

Stacklume es un **dashboard personal** que transforma la forma en que guardas, organizas y accedes a tus bookmarks. Olvídate de las listas aburridas de favoritos — visualiza tu contenido en un **bento grid interactivo** con más de 120 widgets personalizables.

<br />

[![Next.js](https://img.shields.io/badge/Next.js_16-0a1628?style=for-the-badge&logo=next.js&logoColor=d4a853)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React_19-0a1628?style=for-the-badge&logo=react&logoColor=d4a853)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-0a1628?style=for-the-badge&logo=typescript&logoColor=d4a853)](https://www.typescriptlang.org/)
[![Tailwind](https://img.shields.io/badge/Tailwind_v4-0a1628?style=for-the-badge&logo=tailwindcss&logoColor=d4a853)](https://tailwindcss.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-0a1628?style=for-the-badge&logo=postgresql&logoColor=d4a853)](https://www.postgresql.org/)

<br />

[Reportar Bug](https://github.com/SwonDev/Stacklume/issues) · [Solicitar Feature](https://github.com/SwonDev/Stacklume/issues)

</div>

<br />

---

<br />

## 🎯 ¿Qué problema resuelve?

¿Cuántas pestañas tienes abiertas ahora mismo? ¿Cuántos bookmarks tienes guardados que nunca vuelves a ver?

**Stacklume** te ayuda a:

- 📌 **Centralizar** todos tus links importantes en un solo lugar
- 🏷️ **Organizar** con categorías y tags inteligentes
- 🔍 **Encontrar** rápidamente lo que necesitas con búsqueda instantánea
- 📊 **Visualizar** tu contenido de forma atractiva con widgets personalizables
- 🔗 **Detectar** automáticamente el tipo de contenido (YouTube, GitHub, Steam, Spotify...)

<br />

---

<br />

## ✨ Características principales

<table>
<tr>
<td width="50%">

### 🧱 Bento Grid Layout
Arrastra, redimensiona y organiza widgets como quieras. Tu dashboard, tus reglas.

### 📦 120+ Widgets
Desde notas y tareas hasta el tiempo, crypto y repositorios trending de GitHub.

### 🎨 3 Modos de Vista
- **Bento** — Grid visual e interactivo
- **Kanban** — Organización por columnas
- **Lista** — Vista clásica y compacta

</td>
<td width="50%">

### 🏷️ Categorías & Tags
Organiza tus links con carpetas y etiquetas. Filtrado inteligente incluido.

### 🔮 Detección de Plataforma
Identifica automáticamente YouTube, GitHub, Steam, Spotify, Twitter y más.

### 🌙 Tema Dual
Modo oscuro (Navy & Gold) y modo claro (Beige & Gold) elegantes.

</td>
</tr>
</table>

<br />

---

<br />

## 🛠️ Stack Tecnológico

<div align="center">

| Capa | Tecnología |
|:----:|:-----------|
| ⚡ **Framework** | Next.js 16 (App Router) + React 19 |
| 🗄️ **Database** | Neon PostgreSQL + Drizzle ORM |
| 🎨 **UI** | shadcn/ui + Radix UI + Tailwind v4 |
| 📦 **Estado** | Zustand con persistencia |
| 🎬 **Animaciones** | Motion (Framer Motion) |
| 🧱 **Grid** | react-grid-layout |
| 🖱️ **Drag & Drop** | @dnd-kit |
| ✅ **Forms** | React Hook Form + Zod |

</div>

<br />

---

<br />

## 🚀 Instalación

### Requisitos previos

- Node.js 18+
- pnpm (recomendado) o npm
- Base de datos PostgreSQL ([Neon](https://neon.tech) es gratis)

### Pasos

```bash
# 1. Clonar el repositorio
git clone https://github.com/SwonDev/Stacklume.git
cd Stacklume

# 2. Instalar dependencias
pnpm install

# 3. Configurar variables de entorno
cp .env.example .env.local
# Editar .env.local con tu DATABASE_URL

# 4. Crear tablas en la base de datos
pnpm db:push

# 5. Iniciar servidor de desarrollo
pnpm dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

<br />

---

<br />

## 📁 Estructura del proyecto

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API REST (links, categories, tags, widgets...)
│   ├── layout.tsx         # Layout raíz con providers
│   └── page.tsx           # Dashboard principal
├── components/
│   ├── bento/             # BentoGrid y BentoCard
│   ├── kanban/            # Vista Kanban
│   ├── modals/            # Modales (añadir/editar links, widgets...)
│   ├── ui/                # Componentes shadcn/ui
│   └── widgets/           # 120+ widgets implementados
├── hooks/                 # Custom hooks (shortcuts, etc.)
├── lib/
│   ├── db/                # Drizzle ORM (schema, client)
│   └── security/          # Protección SSRF
├── stores/                # Zustand stores
│   ├── links-store.ts     # Links, categorías, tags
│   ├── widget-store.ts    # Gestión de widgets
│   ├── kanban-store.ts    # Columnas kanban
│   └── settings-store.ts  # Preferencias de usuario
└── types/                 # Tipos TypeScript
```

<br />

---

<br />

## 🧩 Widgets disponibles

<details>
<summary><strong>📋 Ver todos los widgets (120+)</strong></summary>

<br />

| Categoría | Widgets |
|-----------|---------|
| **Links** | Favoritos, Recientes, Categorías, Quick-add, Random Link, Link Manager |
| **Productividad** | Notas, Todo, Pomodoro, Calendario, Countdown, Habit Tracker |
| **Analytics** | Stats, Link Analytics, Bookmark Growth, Tag Cloud |
| **Media** | YouTube, Spotify, CodePen, Unsplash, Image Embed |
| **Developer** | GitHub Trending, GitHub Search, Deployment Status, QR Code |
| **Utilidades** | Clock, Weather, Crypto, Calculator, Stopwatch, Dice Roller |
| **Text Tools** | JSON Formatter, Base64, Regex Tester, JWT Decoder, Markdown |
| **Converters** | Units, Currency, Timezone, Color, Number, Aspect Ratio |
| **CSS Generators** | Gradient, Glassmorphism, Neumorphism, Box Shadow, Clip Path |
| **Game Dev** | Sprite Sheet, Tilemap, Pathfinding, Particle System, Skill Tree |

</details>

<br />

---

<br />

## ⌨️ Atajos de teclado

| Atajo | Acción |
|:-----:|:-------|
| `Cmd/Ctrl + K` | Abrir búsqueda |
| `Cmd/Ctrl + N` | Nuevo link |
| `Escape` | Cerrar modal / Limpiar búsqueda |

<br />

---

<br />

## ⚙️ Variables de entorno

Crea un archivo `.env.local` basándote en `.env.example`:

```env
# Requerido - Neon PostgreSQL
DATABASE_URL="postgresql://usuario:password@host/database?sslmode=require"

# Opcional - Rate limiting con Upstash
UPSTASH_REDIS_REST_URL=""
UPSTASH_REDIS_REST_TOKEN=""
```

<br />

---

<br />

## 📜 Scripts disponibles

| Comando | Descripción |
|---------|-------------|
| `pnpm dev` | Servidor de desarrollo |
| `pnpm build` | Build de producción |
| `pnpm start` | Servidor de producción |
| `pnpm lint` | Ejecutar ESLint |
| `pnpm test` | Tests unitarios |
| `pnpm test:e2e` | Tests E2E (Playwright) |
| `pnpm db:push` | Sincronizar schema con DB |
| `pnpm db:studio` | Abrir Drizzle Studio |

<br />

---

<br />

## 🤝 Contribuir

Las contribuciones son bienvenidas. Por favor:

1. Haz fork del proyecto
2. Crea una rama para tu feature (`git checkout -b feature/nueva-feature`)
3. Haz commit de tus cambios (`git commit -m 'Añadir nueva feature'`)
4. Push a la rama (`git push origin feature/nueva-feature`)
5. Abre un Pull Request

<br />

---

<br />

## 📄 Licencia

Este proyecto está bajo la licencia MIT. Ver [LICENSE](LICENSE) para más detalles.

<br />

---

<br />

<div align="center">

### 🌟 Hecho con pasión por [SwonDev](https://github.com/SwonDev)

<br />

**Navy Blue & Gold** · *Tu universo de links, bellamente organizado*

<br />

<img src="assets/logo.svg" alt="Stacklume" width="40" height="40" />

</div>
