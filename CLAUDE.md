# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Stacklume is a link management dashboard built with a bento grid layout. It allows users to save, organize, and visualize bookmarks/links with categories, tags, and customizable widgets.

## Commands

```bash
# Development
pnpm dev          # Start Next.js development server
pnpm dev:https    # Start dev server with HTTPS (for APIs requiring secure context)

# Build & Production
pnpm build        # Build for production
pnpm start        # Start production server

# Linting
pnpm lint         # Run ESLint

# Testing (Vitest)
pnpm test              # Run all tests once
pnpm test:watch        # Run tests in watch mode
pnpm test:ui           # Open Vitest UI
pnpm test:coverage     # Run tests with coverage report
pnpm test src/path/to/file.test.ts  # Run a single test file

# E2E Testing (Playwright)
pnpm test:e2e          # Run E2E tests headless
pnpm test:e2e:ui       # Open Playwright UI mode
pnpm test:e2e:headed   # Run tests with browser visible
pnpm test:e2e:report   # Show HTML test report

# Database (Drizzle ORM with Neon PostgreSQL)
pnpm db:generate  # Generate migrations from schema changes
pnpm db:migrate   # Apply migrations to database
pnpm db:push      # Push schema directly (development)
pnpm db:studio    # Open Drizzle Studio GUI
```

## Architecture

### Tech Stack
- **Framework**: Next.js 16 (App Router, React 19)
- **Database**: Neon PostgreSQL with Drizzle ORM
- **State Management**: Zustand with localStorage persistence
- **UI**: shadcn/ui (new-york style), Tailwind CSS v4, Radix UI primitives
- **Animations**: Motion (formerly Framer Motion)
- **Grid Layout**: react-grid-layout for bento grid
- **Drag & Drop**: @dnd-kit for Kanban view
- **Forms**: React Hook Form + Zod validation

### Directory Structure

```
e2e/                        # Playwright E2E tests
src/
├── app/                    # Next.js App Router
│   ├── api/               # REST API routes
│   │   ├── categories/    # CRUD for categories + reorder
│   │   ├── link-tags/     # Link-tag associations
│   │   ├── links/         # CRUD for links (including [id], import, import-html, reorder routes)
│   │   ├── projects/      # CRUD for projects + reorder
│   │   ├── scrape/        # URL metadata scraping
│   │   ├── settings/      # User settings
│   │   ├── stickers/      # Sticker management
│   │   ├── tags/          # CRUD for tags + link associations + reorder
│   │   ├── widgets/       # Widget CRUD + layouts + clear
│   │   ├── github-trending/ # GitHub trending repos
│   │   ├── github-repos/  # GitHub repository search
│   │   ├── steam-games/   # Steam games data
│   │   └── nintendo-deals/ # Nintendo eShop deals
│   ├── layout.tsx         # Root layout with providers
│   └── page.tsx           # Main dashboard page
├── components/
│   ├── bento/             # BentoGrid and BentoCard components
│   ├── icons/             # Custom icon components
│   ├── kanban/            # KanbanColumn and KanbanLinkListWidget
│   ├── layout/            # Header, Sidebar, FilterBar
│   ├── links/             # RichLinkCard for link display
│   ├── list/              # List view components
│   ├── modals/            # Add/Edit modals for links, categories, tags, widgets, columns
│   ├── projects/          # ProjectDialog for workspace management
│   ├── providers/         # Theme and context providers, ErrorBoundary
│   ├── stickers/          # Sticker overlays and context menu
│   ├── ui/                # shadcn/ui components
│   └── widgets/           # 120+ widget implementations
├── hooks/
│   ├── useKeyboardShortcuts.ts  # Global keyboard shortcuts
│   └── useKanbanShortcuts.ts    # Kanban-specific shortcuts
├── lib/
│   ├── utils.ts           # cn() utility for className merging
│   ├── url-utils.ts       # URL normalization for duplicate detection
│   ├── api-client.ts      # API client utilities
│   ├── platform-detection.ts  # Platform/URL type detection (YouTube, Steam, GitHub, etc.)
│   ├── security/
│   │   └── ssrf-protection.ts  # SSRF protection for scrape API
│   └── db/
│       ├── index.ts       # Drizzle client initialization
│       └── schema.ts      # Database schema definitions
├── stores/
│   ├── links-store.ts     # Links, categories, tags state + modal states
│   ├── layout-store.ts    # Grid layout persistence + edit mode
│   ├── widget-store.ts    # Widget management (persisted to DB)
│   ├── kanban-store.ts    # Kanban columns, WIP limits (persisted to localStorage)
│   ├── settings-store.ts  # User preferences (theme, viewMode, etc.)
│   ├── projects-store.ts  # Project/workspace management
│   ├── sticker-store.ts   # Sticker overlays (persisted to localStorage)
│   └── list-view-store.ts # List view settings and sorting
├── test/
│   └── setup.ts           # Vitest test setup
└── types/
    ├── index.ts           # Centralized type exports
    ├── widget.ts          # Widget type definitions and metadata
    └── widget-utils.ts    # Widget utility functions
```

### Data Model

The database has these core entities (see `src/lib/db/schema.ts`):

**Authentication (NextAuth):**
- **users**: User accounts with email/password or OAuth
- **accounts**: OAuth provider accounts (Google, GitHub, etc.)
- **sessions**: Active user sessions
- **verificationTokens**: Email verification tokens

**Application Data:**
- **links**: URL bookmarks with metadata (title, description, favicon, image, category, platform detection fields, health status)
- **categories**: Organizational folders for links (with soft delete)
- **tags**: Flexible labeling system for links (with soft delete)
- **linkTags**: Many-to-many junction table
- **projects**: Workspaces for organizing widgets (null projectId = Home view)
- **userLayouts**: Stores bento grid configurations (JSON)
- **widgets**: Widget configurations (type, title, config JSON, layout position, projectId)
- **userSettings**: User preferences (theme, viewDensity, viewMode, reduceMotion)
- **userBackups**: JSON backups of user data (manual/auto/export types)

### State Management Pattern

Eight Zustand stores handle different concerns:
1. **useLinksStore**: Links, categories, tags data + modal states
2. **useLayoutStore**: react-grid-layout positions (persisted)
3. **useWidgetStore**: Widget instances and configurations (persisted to localStorage as `stacklume-widgets`)
4. **useKanbanStore**: Kanban columns, view settings, WIP limits (persisted to localStorage as `stacklume-kanban-columns`)
5. **useSettingsStore**: User preferences (theme, view density, etc.)
6. **useProjectsStore**: Project/workspace management
7. **useStickerStore**: Sticker overlays on the dashboard (persisted to localStorage)
8. **useListViewStore**: List view settings and sorting preferences

### Widget System

120+ widget types organized into categories, with 5 size presets (small, medium, large, wide, tall). Widgets are rendered in a react-grid-layout bento grid.

**Widget Categories:**
- **Links**: favorites, recent, category, tag, categories, quick-add, bookmarks, random-link, link-manager
- **Productivity**: notes, todo, pomodoro, calendar, countdown, habit-tracker, progress, search
- **Analytics**: stats, link-analytics, bookmark-growth, reading-streak, github-activity, tag-cloud
- **Media Embeds**: youtube, spotify, codepen, embed, unsplash, image
- **Developer Tools**: github-trending, github-search, mcp-explorer, deployment-status, qr-code
- **Utilities**: clock, world-clock, weather, quote, crypto, color-palette, website-monitor, calculator, stopwatch, dice-roller
- **Text/Code Tools**: json-formatter, base64-tool, regex-tester, jwt-decoder, markdown-preview, hash-generator, lorem-ipsum, word-counter, password-generator
- **Converters**: unit-converter, currency-converter, color-converter, timezone-converter, number-converter, aspect-ratio, age-calculator
- **CSS Generators**: gradient-generator, glassmorphism, neumorphism, box-shadow-generator, clip-path-generator, text-shadow-generator, css-animation, css-filter, css-transform, css-grid, flexbox-playground, svg-wave, tailwind-colors, typography-scale, contrast-checker, spacing-calculator
- **Game Development**: sprite-sheet, tilemap-editor, pathfinding, behavior-tree, skill-tree, dialogue-tree, particle-system, hitbox-editor, quest-designer, wave-spawner, inventory-grid, camera-shake, damage-calculator, level-progress, loot-table, rpg-stats, state-machine, easing-functions, bezier-curve, noise-generator, pixel-art, color-ramp, game-math, health-bar, physics-playground, input-mapper, achievement, name-generator, frame-rate, screen-resolution
- **Organization & Productivity (Design/Dev)**: design-tokens, code-snippets, sprint-tasks, decision-log, eisenhower-matrix, standup-notes, mood-board, api-reference, meeting-notes, weekly-goals, parking-lot, pr-checklist, tech-debt, project-timeline, component-docs, wireframe, design-review, env-vars, git-commands
- **Custom**: custom (multi-mode widget), voice-notes, prompt, rss-feed, steam-games, ip-info, uuid-generator

**Widget Properties:**
- Type and size preset (maps to grid dimensions)
- Config (type-specific options stored as JSON)
- Layout position (x, y, w, h)
- Project assignment (projectId for multi-workspace support)
- Kanban properties (kanbanColumnId, kanbanOrder, kanbanHeight) for kanban view mode
- Visual customization (backgroundColor, backgroundGradient, accentColor, opacity, isLocked)

See `src/types/widget.ts` for type definitions and `src/stores/WIDGET_STORE_GUIDE.md` for detailed widget API documentation.

### View Modes

Three view modes are supported:
- **Bento**: Draggable grid layout using react-grid-layout
- **Kanban**: Column-based workflow view with draggable widgets between columns
- **List**: Traditional list view with sorting options

The active view mode is stored in `userSettings.viewMode`. The Kanban store manages columns with features like WIP limits, collapsible columns, and per-column widget type filters.

### Platform Detection

Links automatically detect platform types (YouTube, Steam, GitHub, Spotify, etc.) via `src/lib/platform-detection.ts`. Detected platforms get:
- `platform` field (e.g., "youtube", "steam", "github")
- `contentType` field (e.g., "video", "game", "code")
- `platformColor` for brand-colored UI elements

### API Route Pattern

All API routes follow this pattern:
- Return JSON responses via `NextResponse.json()`
- Use Drizzle ORM query builder
- Handle errors with try/catch returning 500 status

## Environment Variables

Required in `.env.local`:
```
DATABASE_URL=postgresql://...  # Neon connection string
```

## Adding shadcn/ui Components

```bash
npx shadcn@latest add <component-name>
```

Components use the `@/` alias and are configured in `components.json`.

## Keyboard Shortcuts

- `Cmd/Ctrl + K` - Focus search input
- `Cmd/Ctrl + N` - Open new link modal (when not in input field)
- `Escape` - Clear search or exit edit mode

## Link Import

The app supports importing links via:
- **JSON API** (`/api/links/import`) - POST JSON array of links
- **HTML Bookmarks** (`/api/links/import-html`) - Parse exported browser bookmarks HTML

## Security

The scrape API (`/api/scrape`) includes SSRF protection via `src/lib/security/ssrf-protection.ts`:
- Blocks internal/private IP ranges (localhost, 10.x.x.x, 192.168.x.x, etc.)
- DNS rebinding protection with hostname validation
- Protocol whitelist (only http/https allowed)
- Configurable allow/deny lists for hosts

## Soft Deletes

Links, categories, tags, projects, and widgets use soft deletes via `deletedAt` timestamp. When querying, filter out deleted items with `isNull(table.deletedAt)`.
