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
pnpm test src/path/to/file.test.ts      # Run a single test file
pnpm test src/stores/                    # Run tests in a directory
pnpm test -t "test name"                 # Run tests matching name

# E2E Testing (Playwright)
pnpm test:e2e          # Run E2E tests headless
pnpm test:e2e:ui       # Open Playwright UI mode
pnpm test:e2e:headed   # Run tests with browser visible
pnpm test:e2e:report   # Show HTML test report

# Utilities
pnpm generate:icons    # Generate icon components from SVGs

# Database (Drizzle ORM with Neon PostgreSQL)
pnpm db:generate  # Generate migrations from schema changes
pnpm db:migrate   # Apply migrations to database
pnpm db:push      # Push schema directly (development)
pnpm db:studio    # Open Drizzle Studio GUI

# Tauri Desktop App
pnpm tauri:dev         # Run desktop app in dev mode (Next.js via beforeDevCommand)
pnpm tauri:build       # Full release pipeline: build + sign .exe + generate update-manifest.json + upload to GitHub release
pnpm build:desktop     # Only build Next.js standalone + copy resources (no Rust compile, no signing)
pnpm db:sqlite:generate  # Generate SQLite migrations from schema.sqlite.ts
pnpm db:sqlite:migrate   # Apply SQLite migrations
```

## Architecture

### Tech Stack
- **Framework**: Next.js 16 (App Router, React 19)
- **Database**: Neon PostgreSQL (web) / SQLite via libsql (desktop) — both with Drizzle ORM
- **Desktop**: Tauri v2 + Node.js 25.2.1 bundled, WebView2 (Windows)
- **State Management**: Zustand (no persist middleware in `useLinksStore`)
- **UI**: shadcn/ui (new-york style), Tailwind CSS v4, Radix UI primitives
- **Animations**: Motion (formerly Framer Motion)
- **3D**: React Three Fiber + drei for the spinning coin logo
- **Grid Layout**: react-grid-layout for bento grid
- **Drag & Drop**: @dnd-kit for Kanban view
- **Forms**: React Hook Form + Zod validation

### Directory Structure

```
e2e/                        # Playwright E2E tests
src-tauri/                  # Rust/Tauri desktop app
├── src/lib.rs              # Main Rust: setup, open_url command, tray, Node.js spawn
├── Cargo.toml              # Tauri v2 + windows-sys dependencies
├── tauri.conf.json         # App config (withGlobalTauri: true, decorations: false)
├── capabilities/           # Tauri permissions
└── resources/              # node/ (node.exe) + server/ (.next/standalone) — gitignored
scripts/
├── build-desktop.mjs       # Full desktop pipeline: Next.js build → copy resources → update tauri.conf.json
├── build-release.mjs       # Release pipeline: load signing key → tauri build → sign .exe → update-manifest.json → GitHub upload
└── generate-icons.mjs      # Generate icon components from SVGs
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
│   ├── demo/              # DemoBanner, componentes específicos del modo demo
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
│   ├── useKeyboardShortcuts.ts  # Global keyboard shortcuts (Ctrl+K, Ctrl+N, Escape)
│   ├── useKanbanShortcuts.ts    # Kanban-specific shortcuts
│   ├── useMultiSelect.ts        # Zustand store (lives in hooks/) — global multi-select state; use via useMultiSelect.getState()
│   ├── useUndoRedo.ts           # Undo/redo (Ctrl+Z/Y) backed by history-store
│   ├── useElectron.ts           # Tauri/desktop detection wrapper (isTauriWebView)
│   ├── useOfflineStatus.ts      # Online/offline status + pending sync count
│   ├── useCsrf.ts               # CSRF token fetch and caching
│   ├── useFormDraft.ts          # Auto-save draft persistence for React Hook Form
│   ├── useReducedMotion.ts      # Reduced motion preference (settings + OS prefers-reduced-motion)
│   └── useStickerSounds.ts      # Sound effects for sticker interactions
├── lib/
│   ├── utils.ts           # cn() utility for className merging
│   ├── url-utils.ts       # URL normalization for duplicate detection
│   ├── desktop.ts         # Tauri detection (isTauriWebView), openExternalUrl, updateTrayIcon
│   ├── platform-detection.ts  # Platform/URL type detection (YouTube, Steam, GitHub, etc.)
│   ├── demo/
│   │   ├── interceptor.ts # Intercepta window.fetch para /api/* CRUD → localStorage (modo demo)
│   │   └── storage.ts     # CRUD completo en localStorage para modo demo
│   ├── security/
│   │   └── ssrf-protection.ts  # SSRF protection for scrape API
│   └── db/
│       ├── index.ts       # db proxy, generateId(), withRetry(), getCurrentDatabaseType()
│       ├── schema.ts      # PostgreSQL schema (Drizzle pg-core)
│       └── schema.sqlite.ts   # SQLite schema (Drizzle sqlite-core) — desktop only
├── stores/
│   ├── links-store.ts     # Links, categories, tags state + modal states
│   ├── layout-store.ts    # Grid layout persistence + edit mode
│   ├── widget-store.ts    # Widget management (persisted to DB)
│   ├── kanban-store.ts    # Kanban columns, WIP limits (persisted to localStorage)
│   ├── settings-store.ts  # User preferences (theme, viewMode, etc.)
│   ├── projects-store.ts  # Project/workspace management
│   ├── sticker-store.ts   # Sticker overlays (persisted to localStorage)
│   ├── list-view-store.ts # List view settings and sorting
│   └── history-store.ts   # Undo/redo history (DELETE/MOVE/UPDATE actions for links, widgets, categories, tags)
├── test/
│   └── setup.ts           # Vitest test setup
└── types/
    ├── index.ts           # Centralized type exports
    ├── widget.ts          # Widget type definitions and metadata
    └── widget-utils.ts    # Widget utility functions
```

### Tauri Desktop App

The app ships as a native Windows installer that bundles Next.js standalone + Node.js 25.2.1. Key architectural decisions:

**Production startup flow** (`src-tauri/src/lib.rs`):
1. Show loading screen immediately (data: URI, no flicker)
2. Spawn `node.exe server.js` with `CREATE_NO_WINDOW` + Windows Job Object (auto-kills node.exe on any exit)
3. Poll `http://127.0.0.1:{port}/api/health` every 500ms (40s timeout)
4. Navigate WebView to the app when ready; show error page with server.log tail on timeout

**Desktop mode** (`DESKTOP_MODE=true`):
- Auth and CSRF are **bypassed** — `src/proxy.ts` returns early
- DB is SQLite at `%APPDATA%\com.stacklume.app\stacklume.db`
- Frontend detects this via `window.__DESKTOP_MODE__` (injected synchronously in `layout.tsx`)
- `isTauriWebView()` in `src/lib/desktop.ts` checks this flag

**External links** in Tauri: `<a target="_blank">` doesn't work in WebView2. The `AppShell.tsx` intercepts all `http(s)://` clicks and routes them through `openExternalUrl()` → Rust `open_url` command → `cmd /c start "" <url>` with `CREATE_NO_WINDOW`.

**Tauri commands** exposed to frontend: `open_url`, `get_server_port`, `get_app_data_dir`, `minimize_window`, `toggle_maximize_window`, `close_window`, `update_tray_icon`, `download_and_run_update`

**System tray**: Animated icon updated at 30fps via `TrayIconUpdater.tsx` (offscreen Three.js canvas → `update_tray_icon`). Closing the window hides to tray instead of quitting; tray menu has "Abrir Stacklume" / "Cerrar".

**Auto-updater**: Custom Rust command `download_and_run_update` — does **NOT** use `tauri-plugin-updater` (avoided to bypass ACL requirements). `UpdateChecker.tsx` (in `layout.tsx`) checks for updates 6s after startup via GitHub API. If a new version exists, shows a toast; on confirm, frontend calls `invoke("download_and_run_update", { url: installerUrl })` → Rust downloads `.exe` to `%TEMP%\StacklumeUpdate.exe` via ureq (with `redirects(5)`) → validates size ≥ 1 MB → spawns installer (NSIS hook closes the running app automatically). Update manifest: `https://github.com/SwonDev/Stacklume/releases/latest/download/update-manifest.json`. Signing key: `TAURI_SIGNING_PRIVATE_KEY` + `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` in `.env.local`.

**Release pipeline** (`pnpm tauri:build` → `scripts/build-release.mjs`):
1. Loads signing keys from `.env.local`
2. Runs `pnpm exec tauri build` (triggers `build:desktop` internally)
3. Signs the `.exe` with `tauri signer sign -k <key> -p <password>`
4. Generates `update-manifest.json` with version, download URL, and signature
5. Uploads installer + `.sig` + manifest to GitHub release via `gh release upload --clobber`

**Installer output**: `src-tauri/target/release/bundle/nsis/Stacklume_x.x.x_x64-setup.exe`

### Authentication

The app uses a **custom JWT/bcrypt system** (not NextAuth), implemented in `src/lib/auth.ts`:
- Credentials stored in env vars (`AUTH_USERNAME`, `AUTH_PASSWORD_HASH`)
- JWT tokens signed with `AUTH_SECRET`, stored in `stacklume-auth` HttpOnly cookie (7-day expiry)
- Auth routes: `/api/auth/login`, `/api/auth/logout`, `/api/auth/session`
- Session check: `isAuthenticated()` or `getSession()` from `src/lib/auth.ts`

The schema (`src/lib/db/schema.ts`) has NextAuth-style tables (`users`, `accounts`, `sessions`, `verificationTokens`) kept for potential future multi-user support but not actively used by the current auth flow.

### Data Model

The database has these core entities (see `src/lib/db/schema.ts`):

**Application Data:**

- **links**: URL bookmarks with metadata (title, description, favicon, image, category, platform detection fields, health status, `isRead`, `notes`, `reminderAt`). Has `uniqueIndex` on `url` — duplicates return HTTP 409.
- **categories**: Organizational folders for links (with soft delete)
- **tags**: Flexible labeling system for links; unique per `(userId, name)` pair (with soft delete)
- **linkTags**: Many-to-many junction table
- **projects**: Workspaces for organizing widgets (null projectId = Home view) (with soft delete)
- **userLayouts**: Stores bento grid configurations (JSON)
- **widgets**: Widget configurations (type, title, config JSON, layoutX/Y/W/H, projectId) (with soft delete)
- **userSettings**: User preferences — theme, viewDensity, viewMode, reduceMotion, language (`es`/`en`), gridColumns (lg col count), sidebarAlwaysVisible, defaultSortField, defaultSortOrder, thumbnailSize (`none`/`small`/`medium`/`large`), sidebarDensity, autoBackupInterval (days), confirmBeforeDelete, linkClickBehavior (`new-tab`/`same-tab`)
- **userBackups**: JSON backups of user data (manual/auto/export types)

### State Management Pattern

Nine Zustand stores + one store-as-hook handle different concerns:
1. **useLinksStore**: Links, categories, tags data + modal states (fetches from DB on load). **No persist middleware** — data lives in memory only. Includes `refreshAllData()` which re-fetches all 4 endpoints with `cache: "no-store"` and applies a single atomic `set()` — use this after any operation that modifies the server DB to avoid WebView2 HTTP cache stale reads.
2. **useLayoutStore**: react-grid-layout positions (persisted to localStorage)
3. **useWidgetStore**: Widget instances and configurations (persisted to localStorage as `stacklume-widgets`)
4. **useKanbanStore**: Kanban columns, view settings, WIP limits (persisted to localStorage as `stacklume-kanban-columns`)
5. **useSettingsStore**: User preferences (theme, view density, etc.) (synced to DB)
6. **useProjectsStore**: Project/workspace management (fetches from DB on load)
7. **useStickerStore**: Sticker overlays on the dashboard (persisted to localStorage)
8. **useListViewStore**: List view settings and sorting preferences
9. **useHistoryStore** (`src/stores/history-store.ts`): Undo/redo stack for delete/move/update actions on links, widgets, categories and tags. Backed by `useUndoRedo.ts` hook (Ctrl+Z / Ctrl+Y).

**useMultiSelect** (`src/hooks/useMultiSelect.ts`) is also a Zustand store despite living in `hooks/`. Access it outside React via `useMultiSelect.getState()`. Manages `isSelecting`, `selectedIds (Set<string>)`, `toggleSelecting()`, `selectAll()`, `toggleItem()`, `exitSelecting()`.

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
- **Custom User** (`custom-user`): AI-generated widgets rendered in sandboxed `<iframe srcdoc>`. Backed by `customWidgetTypes` DB table.

**Widget Properties:**
- Type and size preset (maps to grid dimensions)
- Config (type-specific options stored as JSON)
- Layout position (x, y, w, h)
- Project assignment (projectId for multi-workspace support)
- Kanban properties (kanbanColumnId, kanbanOrder, kanbanHeight) for kanban view mode
- Visual customization (backgroundColor, backgroundGradient, accentColor, opacity, isLocked)

See `src/types/widget.ts` for type definitions and `src/stores/WIDGET_STORE_GUIDE.md` for detailed widget API documentation.

### MCP Server & Custom Widgets

**MCP endpoint**: `POST /api/mcp` — JSON-RPC 2.0, no external SDK. Auth via `Authorization: Bearer <mcpApiKey>` (configured in Settings). Added to `PUBLIC_API_ROUTES` and `CSRF_EXEMPT_ROUTES`.

**23 tools**: widget CRUD, custom widget type CRUD, links CRUD, categories/tags/projects (read), settings.

**Custom widget types** (`customWidgetTypes` table): AI creates a type with `htmlTemplate` (full HTML page), `configSchema`, `defaultConfig`, `defaultWidth/Height`. The `{{CONFIG_JSON}}` placeholder in the template is replaced with `JSON.stringify(config)` at render time. Widgets are rendered in `<iframe sandbox="allow-scripts" srcdoc={processedHtml}>`.

**Widget postMessage protocol** (`CustomUserWidget.tsx` ↔ iframe):

| Direction | Message type | Payload | Effect |
|-----------|-------------|---------|--------|
| iframe → parent | `stacklume:save` | `{ config: {...} }` | Saves config to DB via `useWidgetStore.getState().updateWidget()` |
| parent → iframe | `stacklume:saved` | `{ success: boolean }` | Confirms save |
| iframe → parent | `stacklume:get-config` | — | Requests current config |
| parent → iframe | `stacklume:config` | `{ config: {...} }` | Returns current config |

Iframe code pattern for self-persistence:
```javascript
const CONFIG = {{CONFIG_JSON}};
function saveConfig(newConfig) {
  window.parent.postMessage({ type: 'stacklume:save', config: newConfig }, '*');
}
```

**Settings**: MCP can be toggled in Settings → "MCP". Toggle generates a random API key, displays Claude Desktop and Cursor config snippets.

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

### Dual-Database Pattern (PostgreSQL + SQLite)

The `db` export from `src/lib/db/index.ts` is a Proxy that transparently switches between Neon and SQLite based on `DESKTOP_MODE`. **Critical rules for all API routes:**

1. **Always call `generateId()`** as the first field of every insert — PostgreSQL auto-generates UUIDs but SQLite requires explicit IDs:
```typescript
import { db, generateId } from "@/lib/db";
const [created] = await db.insert(table).values({ id: generateId(), ...rest }).returning();
```

2. **Use `like` for search, not `ilike`** — `ilike` is PostgreSQL-only. Check the DB type:
```typescript
import { getCurrentDatabaseType } from "@/lib/db";
const fn = getCurrentDatabaseType() === "sqlite" ? like : ilike;
conditions.push(or(fn(table.title, pattern), fn(table.description, pattern))!);
```

3. **Booleans** — `schema.ts` uses a custom `boolCol` type (wraps `boolean()` with `fromDriver(v) => Boolean(v)`) to handle SQLite's 0/1 integers. Never use raw `boolean()` from drizzle-orm/pg-core in schema.ts.

4. **Always filter soft-deleted rows**: `.where(isNull(table.deletedAt))`

### API Route Pattern

All API routes follow this pattern:
- Return JSON responses via `NextResponse.json()`
- Use Drizzle ORM query builder wrapped in `withRetry()` for transient error resilience
- Handle errors with try/catch returning 500 status
- Validate inputs with Zod schemas from `src/lib/validations/index.ts` via `validateRequest()`
- Log with `createModuleLogger('api/route-name')` from `src/lib/logger.ts` (pino-based)

```typescript
import { db, withRetry } from "@/lib/db";
import { createModuleLogger } from "@/lib/logger";
import { validateRequest, createLinkSchema } from "@/lib/validations";

const log = createModuleLogger("api/example");

// All DB operations use withRetry for cold-start resilience
const result = await withRetry(
  () => db.select().from(table).where(...),
  { operationName: "fetch example" }
);
```

Paginated responses use `createPaginatedResponse(data, page, limit, total)` from `@/lib/db`.

## Environment Variables

Required in `.env.local`:
```bash
# Required - Neon PostgreSQL
DATABASE_URL="postgresql://..."

# Required for production - Simple credentials auth
AUTH_USERNAME="your-username"
AUTH_PASSWORD_HASH="bcrypt-hash"  # Generate: node -e "require('bcryptjs').hash('password', 10).then(console.log)"
AUTH_SECRET="random-secret"       # Generate: openssl rand -base64 32

# Optional - Rate limiting (Upstash Redis)
UPSTASH_REDIS_REST_URL=""
UPSTASH_REDIS_REST_TOKEN=""
```

In desktop mode these vars are set at runtime by `src-tauri/src/lib.rs` and `scripts/build-desktop.mjs`:
- `DESKTOP_MODE=true` — activates SQLite, disables auth/CSRF
- `DATABASE_PATH` — path to `stacklume.db` in `%APPDATA%\com.stacklume.app\`
- `PORT` + `HOSTNAME=127.0.0.1` — local Next.js server binding
- Private keys are embedded in `src-tauri/resources/server/.env.keys` (gitignored, written by `build-desktop.mjs`)

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

## Key lib/ Modules

| File | Purpose |
|------|---------|
| `src/lib/validations/index.ts` | Zod schemas + `validateRequest()` helper for all API inputs |
| `src/lib/logger.ts` | Pino-based logger; use `createModuleLogger('module-name')` |
| `src/lib/cache.ts` | In-memory caching utilities |
| `src/lib/rate-limit.ts` | Upstash Redis rate limiting for API routes |
| `src/lib/security/csrf.ts` | CSRF protection middleware |
| `src/lib/backup/backup-service.ts` | Data export/import and backup management |
| `src/lib/export-utils.ts` | Link export utilities (JSON, CSV, HTML) |
| `src/lib/analytics.ts` | Link analytics tracking |
| `src/lib/responsive-layout.ts` | Responsive bento grid helpers. `BREAKPOINTS={lg:1200,md:996,sm:768,xs:480}`, `COLS={lg:12,md:10,sm:6,xs:1}`. Note: BentoGrid uses different `effectiveBreakpoints={lg:900,md:680,sm:480,xs:0}` and `effectiveCols={...COLS, lg:gridColumns}`. xs layout uses **cumulative Y** (not array index) to avoid overlap. |
| `src/lib/i18n.ts` | Internacionalización — diccionarios `es`/`en`, función `t()`, hook `useTranslations()` |
| `src/lib/offline/` | PWA offline support and service worker registration |
| `src/lib/demo/interceptor.ts` | Intercepta fetch() API calls en modo demo, redirige a localStorage |
| `src/lib/demo/storage.ts` | CRUD completo en localStorage para modo demo (links, categories, tags, widgets, projects, settings) |

## Demo Mode

The demo mode (`NEXT_PUBLIC_DEMO_MODE=true` + `DEMO_MODE=true`) runs Stacklume entirely in the browser with no database required. Data is stored in `localStorage`.

**How it works:**
1. `DemoProvider.tsx` installs the fetch interceptor synchronously on first render
2. `src/lib/demo/interceptor.ts` replaces `window.fetch` — CRUD calls to `/api/*` are redirected to localStorage; external API calls (`/api/scrape`, `/api/github-*`, etc.) pass through to the server
3. `src/lib/demo/storage.ts` implements full CRUD in localStorage with `readArrayKey<T>()` guard (`Array.isArray` check) to avoid `TypeError` if data is in Zustand persist format

**Active at:** [demo.stacklume.app](https://demo.stacklume.app) — `NEXT_PUBLIC_DEMO_MODE=true` + `DEMO_MODE=true` set in Vercel project settings.

**Key constraint:** Data lives only in the current browser. No sync, no server backups.

## Safari/WebKit — APIs no estándar

**NEVER** use optional chaining (`?.`) to call APIs that may not be declared as global variables. In JavaScriptCore (Safari/WebKit), if the variable doesn't exist, `?.` does **not** prevent `ReferenceError` — the engine throws before evaluating the operator.

```javascript
// ❌ WRONG — crashes in Safari with ReferenceError
requestIdleCallback?.(() => doWork());

// ✅ CORRECT — typeof guard first
if (typeof requestIdleCallback === "function") {
  requestIdleCallback(() => doWork());
}
```

This rule applies to any non-standard or partially-supported browser API (e.g., `requestIdleCallback`, `scheduler.postTask`).

## Service Worker — Cache Versioning

`public/sw.js` uses cache-first for `/_next/static/*`. After a deploy with JS changes, old cached chunks will be served unless the cache name is bumped.

**Rule:** Increment `STATIC_CACHE_NAME` and `API_CACHE_NAME` in `public/sw.js` in every release that includes JavaScript changes.

```javascript
const STATIC_CACHE_NAME = "stacklume-static-v9";  // ← bump on each JS-changing release
const API_CACHE_NAME    = "stacklume-api-v9";      // ← bump on each JS-changing release
```

Current version: `v9`.

## Security

The scrape API (`/api/scrape`) includes SSRF protection via `src/lib/security/ssrf-protection.ts`:
- Blocks internal/private IP ranges (localhost, 10.x.x.x, 192.168.x.x, etc.)
- DNS rebinding protection with hostname validation
- Protocol whitelist (only http/https allowed)
- Configurable allow/deny lists for hosts

CSRF protection is applied via `src/lib/security/csrf.ts`. Error monitoring via Sentry (`@sentry/nextjs`).

## Soft Deletes

Links, categories, tags, projects, and widgets use soft deletes via `deletedAt` timestamp. When querying, filter out deleted items with `isNull(table.deletedAt)`.
