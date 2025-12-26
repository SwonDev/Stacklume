<div align="center">

# Stacklume

### Your Link Universe, Beautifully Organized

<br />

[Live Demo](#) · [Report Bug](https://github.com/SwonDev/Stacklume/issues) · [Request Feature](https://github.com/SwonDev/Stacklume/issues)

<br />

![Next.js](https://img.shields.io/badge/Next.js_16-black?style=for-the-badge&logo=next.js)
![React](https://img.shields.io/badge/React_19-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_v4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)

</div>

---

## About

**Stacklume** is a modern link management dashboard with a beautiful bento grid layout. Save, organize, and visualize your bookmarks with categories, tags, and 120+ customizable widgets.

<br />

### Key Features

| Feature | Description |
|---------|-------------|
| **Bento Grid Layout** | Draggable, resizable widgets in a beautiful grid |
| **120+ Widgets** | From notes to weather, crypto to GitHub trending |
| **3 View Modes** | Bento, Kanban, and List views |
| **Smart Categories** | Organize links with folders and tags |
| **Platform Detection** | Auto-detect YouTube, GitHub, Steam, Spotify & more |
| **Dark Mode** | Beautiful light and dark themes |
| **Keyboard Shortcuts** | Power-user friendly navigation |

---

## Tech Stack

```
Framework    →  Next.js 16 (App Router, React 19)
Database     →  Neon PostgreSQL + Drizzle ORM
State        →  Zustand with persistence
UI           →  shadcn/ui + Radix UI + Tailwind v4
Animations   →  Motion (Framer Motion)
Grid         →  react-grid-layout
Drag & Drop  →  @dnd-kit
Forms        →  React Hook Form + Zod
```

---

## Quick Start

### Prerequisites

- Node.js 18+
- pnpm (recommended) or npm
- PostgreSQL database ([Neon](https://neon.tech) recommended)

### Installation

```bash
# Clone the repository
git clone https://github.com/SwonDev/Stacklume.git
cd Stacklume

# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your database URL

# Push database schema
pnpm db:push

# Start development server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start development server |
| `pnpm build` | Build for production |
| `pnpm start` | Start production server |
| `pnpm lint` | Run ESLint |
| `pnpm test` | Run unit tests |
| `pnpm test:e2e` | Run E2E tests |
| `pnpm db:push` | Push schema to database |
| `pnpm db:studio` | Open Drizzle Studio |

---

## Project Structure

```
src/
├── app/                # Next.js App Router
│   ├── api/           # REST API routes
│   ├── layout.tsx     # Root layout
│   └── page.tsx       # Main dashboard
├── components/
│   ├── bento/         # Bento grid components
│   ├── kanban/        # Kanban view
│   ├── modals/        # Dialogs and modals
│   ├── ui/            # shadcn/ui components
│   └── widgets/       # 120+ widget implementations
├── hooks/             # Custom React hooks
├── lib/
│   └── db/            # Drizzle ORM setup
├── stores/            # Zustand state stores
└── types/             # TypeScript types
```

---

## Widget Categories

<details>
<summary><strong>View all 120+ widgets</strong></summary>

- **Links** — favorites, recent, categories, quick-add
- **Productivity** — notes, todo, pomodoro, calendar
- **Analytics** — stats, charts, tag clouds
- **Media** — YouTube, Spotify, CodePen embeds
- **Developer** — GitHub trending, deployment status
- **Utilities** — clock, weather, crypto, calculator
- **Text Tools** — JSON formatter, regex tester, markdown
- **Converters** — units, currency, timezone
- **CSS Generators** — gradients, shadows, animations
- **Game Dev** — sprite sheets, tilemaps, pathfinding

</details>

---

## Environment Variables

Create a `.env.local` file with:

```env
# Required - Neon PostgreSQL
DATABASE_URL="postgresql://..."

# Optional - Upstash Redis (rate limiting)
UPSTASH_REDIS_REST_URL=""
UPSTASH_REDIS_REST_TOKEN=""
```

See `.env.example` for all available options.

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd/Ctrl + K` | Focus search |
| `Cmd/Ctrl + N` | New link |
| `Escape` | Clear search / Exit edit mode |

---

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the project
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## License

This project is licensed under the MIT License.

---

<div align="center">

Made with love by [SwonDev](https://github.com/SwonDev)

</div>
