# Stacklume Architecture

This document describes the architecture and technical design of Stacklume.

## System Overview

Stacklume is a link management dashboard built with Next.js 16 (App Router) and React 19. It uses a bento grid layout for organizing widgets that display and manage bookmarks/links.

```
┌─────────────────────────────────────────────────────────────────┐
│                         Client Browser                          │
│  ┌───────────────┬────────────────┬─────────────────────────┐  │
│  │   React App   │  Service Worker │   IndexedDB (Offline)   │  │
│  │   (Next.js)   │    (PWA/Cache)  │    (Sync Queue)         │  │
│  └───────────────┴────────────────┴─────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Next.js API Routes                          │
│  ┌───────────────┬────────────────┬─────────────────────────┐  │
│  │   Auth API    │   CRUD APIs    │    External APIs        │  │
│  │  (NextAuth)   │ (links, widgets)│  (scrape, github)       │  │
│  └───────────────┴────────────────┴─────────────────────────┘  │
│                              │                                  │
│  ┌───────────────┬────────────────┬─────────────────────────┐  │
│  │ Rate Limiting │ Error Tracking │    Analytics            │  │
│  │   (Upstash)   │    (Sentry)    │   (Plausible)           │  │
│  └───────────────┴────────────────┴─────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Neon PostgreSQL Database                     │
│  ┌───────────────┬────────────────┬─────────────────────────┐  │
│  │     Users     │     Links      │      Widgets            │  │
│  │   Accounts    │   Categories   │      Projects           │  │
│  │   Sessions    │     Tags       │      Backups            │  │
│  └───────────────┴────────────────┴─────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16 (App Router) |
| UI Library | React 19 |
| Database | Neon PostgreSQL |
| ORM | Drizzle ORM |
| State Management | Zustand |
| UI Components | shadcn/ui (Radix UI + Tailwind) |
| Styling | Tailwind CSS v4 |
| Animations | Motion (formerly Framer Motion) |
| Grid Layout | react-grid-layout |
| Drag & Drop | @dnd-kit |
| Authentication | NextAuth.js |
| Rate Limiting | Upstash Redis |
| Error Monitoring | Sentry |
| Analytics | Plausible |

## Directory Structure

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # REST API routes
│   │   ├── auth/          # NextAuth routes
│   │   ├── links/         # Link CRUD + import
│   │   ├── widgets/       # Widget management
│   │   ├── categories/    # Category management
│   │   ├── tags/          # Tag management
│   │   ├── backup/        # Backup/restore
│   │   └── scrape/        # URL metadata scraping
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Main dashboard
├── components/
│   ├── bento/             # BentoGrid & BentoCard
│   ├── widgets/           # 120+ widget implementations
│   ├── layout/            # Header, Sidebar, FilterBar
│   ├── providers/         # Context providers
│   ├── modals/            # Add/Edit modals
│   └── ui/                # shadcn/ui components
├── hooks/                 # Custom React hooks
├── lib/
│   ├── db/               # Drizzle ORM & schema
│   ├── auth.ts           # NextAuth configuration
│   ├── rate-limit.ts     # Rate limiting logic
│   ├── backup/           # Backup service
│   ├── offline/          # Offline support (SW, sync queue)
│   └── analytics.ts      # Plausible analytics
├── stores/               # Zustand state stores
└── types/                # TypeScript definitions
```

## State Management

Eight Zustand stores manage different concerns:

```
┌──────────────────────────────────────────────────────────────┐
│                     Zustand Stores                            │
├──────────────────┬───────────────────────────────────────────┤
│ useLinksStore    │ Links, categories, tags + modal states    │
│ useWidgetStore   │ Widget instances & configurations         │
│ useLayoutStore   │ react-grid-layout positions               │
│ useKanbanStore   │ Kanban columns & view settings            │
│ useSettingsStore │ User preferences (theme, density)         │
│ useProjectsStore │ Project/workspace management              │
│ useStickerStore  │ Sticker overlays                          │
│ useListViewStore │ List view settings                        │
└──────────────────┴───────────────────────────────────────────┘
```

### Persistence Strategy

- **useWidgetStore**: Persisted to database (via API)
- **useLinksStore**: Persisted to database (via API)
- **useKanbanStore**: Persisted to localStorage
- **useStickerStore**: Persisted to localStorage
- **useSettingsStore**: Persisted to database

## Database Schema

### Core Tables

```sql
-- Authentication (NextAuth)
users, accounts, sessions, verification_tokens

-- Application Data
links          -- URL bookmarks with metadata
categories     -- Organizational folders
tags           -- Flexible labeling
link_tags      -- Many-to-many junction
widgets        -- Widget configurations
projects       -- Workspaces for widgets
user_settings  -- User preferences
user_backups   -- JSON backup storage
```

### Key Relationships

```
users ─┬─< accounts (OAuth)
       ├─< sessions
       ├─< links ─<── link_tags ──>─ tags
       ├─< categories ──<─ links
       ├─< widgets ──<── projects
       └─< user_backups
```

## Widget System

120+ widget types organized into categories:

| Category | Examples |
|----------|----------|
| Links | favorites, recent, category, tag |
| Productivity | notes, todo, pomodoro, calendar |
| Analytics | stats, link-analytics, tag-cloud |
| Developer | github-trending, mcp-explorer |
| Utilities | clock, weather, calculator |
| CSS Tools | gradient-generator, box-shadow |
| Game Dev | sprite-sheet, particle-system |

### Widget Properties

```typescript
interface Widget {
  id: string;
  type: string;
  title: string;
  size: "small" | "medium" | "large" | "wide" | "tall";
  config: WidgetConfig;
  layout: { x, y, w, h };
  projectId?: string;
  isLocked?: boolean;
  backgroundColor?: string;
  backgroundGradient?: string;
}
```

## Authentication Flow

```
┌─────────┐     ┌──────────┐     ┌─────────────┐
│ Browser │────>│ NextAuth │────>│ OAuth       │
│         │     │ API      │     │ Provider    │
└─────────┘     └──────────┘     │(Google/GitHub)
     │               │            └─────────────┘
     │               │                   │
     │               ▼                   ▼
     │          ┌──────────┐      ┌─────────────┐
     │          │ Sessions │<─────│ Accounts    │
     │          │ Table    │      │ Table       │
     │          └──────────┘      └─────────────┘
     │               │
     ▼               ▼
┌─────────────────────────────────────────────┐
│            Authenticated Session             │
│  - User ID available in API routes          │
│  - Data isolated per user                   │
└─────────────────────────────────────────────┘
```

## Rate Limiting Strategy

| Endpoint Type | Limit | Window |
|---------------|-------|--------|
| Read (GET) | 1000 | 1 min |
| Write (POST/PATCH/DELETE) | 100 | 1 min |
| External (scrape, github) | 20 | 1 min |
| Import (bulk) | 5 | 1 hour |

**Important**: Rate limiting NEVER blocks widget content visibility.

## Offline Support

```
┌─────────────────────────────────────────────────────────────┐
│                    Service Worker                            │
├─────────────────────────────────────────────────────────────┤
│ Cache Strategy:                                              │
│ - Static assets: Cache-first                                 │
│ - API responses: Network-first with cache fallback          │
│ - Mutations: Queue in IndexedDB when offline                 │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Sync Queue (IndexedDB)                    │
├─────────────────────────────────────────────────────────────┤
│ When online:                                                 │
│ 1. Process queued mutations                                  │
│ 2. Retry failed requests                                     │
│ 3. Clear successful mutations                                │
└─────────────────────────────────────────────────────────────┘
```

## PWA Features

- **Installable**: manifest.json with icons
- **Offline**: Service worker with caching
- **Sync**: Background sync for mutations
- **Responsive**: Mobile-first design

## Security Measures

1. **SSRF Protection**: Blocked private IP ranges in scrape API
2. **Rate Limiting**: Prevents abuse and DDoS
3. **Input Validation**: Zod schemas for all inputs
4. **CSRF Protection**: NextAuth handles this
5. **SQL Injection**: Parameterized queries via Drizzle ORM
6. **XSS Prevention**: React's built-in escaping

## Error Handling

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│ Client Error│───>│   Sentry    │───>│  Dashboard  │
│  Boundary   │    │   Capture   │    │  & Alerts   │
└─────────────┘    └─────────────┘    └─────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────┐
│ WidgetErrorBoundary: Isolates widget crashes        │
│ - Shows fallback UI                                  │
│ - Doesn't crash entire app                          │
│ - Reports to Sentry with widget context             │
└─────────────────────────────────────────────────────┘
```

## Performance Optimizations

1. **Code Splitting**: Dynamic imports for widgets
2. **Lazy Loading**: LazyWidgetRenderer for 120+ widgets
3. **Memoization**: React.memo for link items
4. **Virtual Scroll**: ScrollArea for long lists
5. **Image Optimization**: next/image with lazy loading
6. **Bundle Size**: Tree-shaking for unused code

## View Modes

| Mode | Description | Layout Library |
|------|-------------|----------------|
| Bento | Draggable grid layout | react-grid-layout |
| Kanban | Column-based workflow | @dnd-kit |
| List | Traditional list view | Native scroll |

## Backup System

```
┌─────────────────────────────────────────────────────────────┐
│                    Backup Flow                               │
├─────────────────────────────────────────────────────────────┤
│ Create Backup:                                               │
│ 1. Gather user data (links, widgets, etc.)                  │
│ 2. Serialize to JSON with version info                      │
│ 3. Store in user_backups table                              │
│ 4. Cleanup old backups (keep last 10)                       │
├─────────────────────────────────────────────────────────────┤
│ Restore Backup:                                              │
│ 1. Validate backup structure                                 │
│ 2. Import data with merge strategy                          │
│ 3. Handle conflicts with onConflictDoNothing                │
└─────────────────────────────────────────────────────────────┘
```

## Future Considerations

- **Multi-tenancy**: User data isolation is already in place
- **Real-time Sync**: WebSocket support for collaboration
- **Mobile Apps**: React Native with shared stores
- **API Access**: Public API for integrations
- **Extensions**: Browser extension for quick saves
