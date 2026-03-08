<div align="center">

<a href="https://demo.stacklume.app">
  <img src="assets/logo-badge.svg" alt="Stacklume Logo" width="140" height="140" />
</a>

<br />
<br />

# Stacklume

### **Tu universo de links, bellamente organizado**

<br />

[![Next.js](https://img.shields.io/badge/Next.js_16-0a1628?style=for-the-badge&logo=nextdotjs&logoColor=d4a853)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-0a1628?style=for-the-badge&logo=typescript&logoColor=d4a853)](https://www.typescriptlang.org/)
[![Tailwind](https://img.shields.io/badge/Tailwind_v4-0a1628?style=for-the-badge&logo=tailwindcss&logoColor=d4a853)](https://tailwindcss.com/)
[![Tauri](https://img.shields.io/badge/Tauri_v2-0a1628?style=for-the-badge&logo=tauri&logoColor=d4a853)](https://tauri.app/)

<br />

<a href="https://github.com/SwonDev/Stacklume/releases/latest">
  <img src="https://img.shields.io/badge/Descargar_para_Windows-d4a853?style=for-the-badge&logo=windows&logoColor=0a1628" height="42" />
</a>
&nbsp;&nbsp;
<a href="https://demo.stacklume.app">
  <img src="https://img.shields.io/badge/Probar_Demo_Online-0a1628?style=for-the-badge&logo=vercel&logoColor=d4a853" height="42" />
</a>

<br />
<br />

[![GitHub Release](https://img.shields.io/github/v/release/SwonDev/Stacklume?style=flat-square&color=d4a853&labelColor=0a1628&logo=github&logoColor=d4a853&label=%C3%9Altima%20versi%C3%B3n)](https://github.com/SwonDev/Stacklume/releases/latest)
[![GitHub Stars](https://img.shields.io/github/stars/SwonDev/Stacklume?style=flat-square&color=d4a853&labelColor=0a1628&logo=github&logoColor=d4a853)](https://github.com/SwonDev/Stacklume)
[![License MIT](https://img.shields.io/badge/Licencia-MIT-d4a853?style=flat-square&labelColor=0a1628)](LICENSE)

</div>

<br />

<img src="https://img.shields.io/badge/━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━-d4a853?style=flat-square" width="100%" height="4" />

<br />

Stacklume es un **dashboard personal** para gestionar bookmarks y links. Olvídate de las listas aburridas de favoritos — visualiza tu contenido en un **bento grid interactivo** con más de 120 widgets personalizables.

<table>
<tr>
<td width="33%" align="center" valign="top">

### Organiza
Categorías, tags y búsqueda instantánea. Todo accesible al instante.

</td>
<td width="33%" align="center" valign="top">

### Personaliza
Bento grid, Kanban o Lista. 23 temas, 120+ widgets, tu dashboard.

</td>
<td width="33%" align="center" valign="top">

### Controla
App de escritorio nativa o self-hosted. Tus datos, tu privacidad.

</td>
</tr>
</table>

<br />

<img src="https://img.shields.io/badge/━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━-d4a853?style=flat-square" width="100%" height="4" />

<br />

## Instalación

### App de escritorio — Windows

La forma más sencilla. Sin login, sin configuración, datos en local.

<div align="center">

<a href="https://github.com/SwonDev/Stacklume/releases/latest">
  <img src="https://img.shields.io/badge/Descargar_Stacklume_para_Windows-d4a853?style=for-the-badge&labelColor=0a1628" height="48" />
</a>

</div>

1. Descarga `Stacklume_x.x.x_x64-setup.exe` desde [Releases](https://github.com/SwonDev/Stacklume/releases/latest)
2. Ejecuta el instalador *(no requiere Node.js ni Visual C++ Redistributable)*
3. Abre Stacklume — acceso directo, sin pantalla de login

> **Requisitos:** Windows 10/11 (64-bit). WebView2 Runtime (incluido en Windows 11, se instala automáticamente en Windows 10).

<br />

### Demo online — Sin registro

Prueba Stacklume en el navegador. Los datos se guardan solo en tu navegador.

<div align="center">

<a href="https://demo.stacklume.app">
  <img src="https://img.shields.io/badge/Abrir_Demo-d4a853?style=for-the-badge&labelColor=0a1628" height="44" />
</a>

</div>

<br />

### Self-hosted — Versión web

Si prefieres alojar tu propia instancia:

**Requisitos previos:** [pnpm](https://pnpm.io/installation), [Neon PostgreSQL](https://neon.tech) (gratuito)

```bash
# 1. Clonar e instalar
git clone https://github.com/SwonDev/Stacklume.git
cd Stacklume
pnpm install

# 2. Configurar entorno
cp .env.example .env.local
# Edita .env.local con tu DATABASE_URL y credenciales de auth

# 3. Inicializar base de datos
pnpm db:push

# 4. Arrancar
pnpm dev
```

Abre [http://localhost:3000](http://localhost:3000). Consulta `.env.example` para ver todas las variables disponibles.

<br />

<img src="https://img.shields.io/badge/━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━-d4a853?style=flat-square" width="100%" height="4" />

<br />

## Características

<table>
<tr>
<td width="50%" valign="top">

**Bento Grid Layout** — Arrastra y redimensiona widgets libremente

**120+ Widgets** — Notas, tareas, clima, crypto, GitHub Trending y mucho más

**3 Modos de Vista** — Bento, Kanban y Lista

**23 Temas** — Dark, Nordic, Catppuccin, Tokyo Night, Rosé Pine, Aurora...

</td>
<td width="50%" valign="top">

**Categorías & Tags** — Organiza y filtra con carpetas y etiquetas

**Detección de plataforma** — YouTube, GitHub, Steam, Spotify y más

**Importación** — Importa bookmarks desde el navegador (HTML)

**MCP Server** — Integración con Claude Desktop / Cursor

</td>
</tr>
</table>

<br />

<details>
<summary><strong>Ver todos los widgets (120+)</strong></summary>

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
| **Gaming** | Nintendo eShop Deals, Steam Games |

</details>

<br />

<img src="https://img.shields.io/badge/━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━-d4a853?style=flat-square" width="100%" height="4" />

<br />

## Licencia

MIT — Ver [LICENSE](LICENSE) para más detalles.

<br />

<div align="center">

<img src="assets/logo-badge.svg" alt="Stacklume" width="80" height="80" />

<br />
<br />

**Hecho con** ♥ **por [SwonDev](https://github.com/SwonDev)**

<br />

[![GitHub](https://img.shields.io/badge/GitHub-0a1628?style=for-the-badge&logo=github&logoColor=d4a853)](https://github.com/SwonDev/Stacklume)
[![Releases](https://img.shields.io/badge/Releases-0a1628?style=for-the-badge&logo=github&logoColor=d4a853)](https://github.com/SwonDev/Stacklume/releases)
[![Star](https://img.shields.io/github/stars/SwonDev/Stacklume?style=for-the-badge&color=d4a853&labelColor=0a1628&logo=github&logoColor=d4a853)](https://github.com/SwonDev/Stacklume)

</div>
