export type WidgetType =
  | 'favorites'        // Shows favorite links
  | 'recent'           // Shows recent links
  | 'category'         // Shows links from a specific category
  | 'tag'              // Shows links with a specific tag
  | 'categories'       // Shows all categories overview
  | 'quick-add'        // Quick add link form
  | 'stats'            // Shows statistics
  | 'link-analytics'   // Shows detailed link analytics and distributions
  | 'clock'            // Shows current time
  | 'notes'            // Simple notes widget
  | 'progress'         // Progress/goals tracking widget
  | 'search'           // Search links widget
  | 'bookmarks'        // Featured/pinned bookmarks widget
  | 'image'            // Image/banner widget
  | 'weather'          // Weather information widget
  | 'quote'            // Inspirational quote widget
  | 'pomodoro'         // Pomodoro timer widget
  | 'calendar'         // Calendar widget
  | 'todo'             // Todo list widget
  | 'custom'           // Highly customizable widget with multiple modes
  | 'countdown'        // Countdown timer to a target date
  | 'habit-tracker'    // Habit tracking with streaks
  | 'tag-cloud'        // Interactive tag cloud visualization
  | 'random-link'      // Random link discovery widget
  | 'github-activity'  // GitHub-style activity grid
  | 'bookmark-growth'  // Bookmark growth chart analytics
  | 'rss-feed'         // RSS feed aggregator
  | 'reading-streak'   // Reading streak calendar
  | 'github-trending' // GitHub trending repos from tom_doerr
  | 'steam-games'     // Steam games widget (new releases, upcoming, sales)
  | 'nintendo-deals'  // Nintendo eShop deals, sales, and new releases
  | 'github-search'   // GitHub repository search widget
  | 'codepen'         // CodePen snippet embeds
  | 'spotify'         // Spotify track/playlist/album embeds
  | 'youtube'         // YouTube video embeds
  | 'crypto'          // Cryptocurrency price tracker
  | 'world-clock'     // Multiple timezone clocks
  | 'color-palette'   // Color palette manager
  | 'unsplash'        // Unsplash random photos
  | 'qr-code'         // QR code generator
  | 'website-monitor' // Website uptime monitor
  | 'embed'           // Generic iframe/HTML embed
  | 'prompt'          // AI prompts manager
  | 'prompt-builder'  // AI prompt builder from selected links and tech stack
  | 'mcp-explorer'    // MCP servers explorer for Claude Code
  | 'deployment-status' // Vercel/Netlify deployment status
  | 'voice-notes'     // Voice recording with transcription
  | 'link-manager'    // Comprehensive link management widget
  // Social/News Feed widgets
  | 'twitter-feed'    // Twitter/X timeline embed
  | 'reddit'          // Reddit posts viewer
  | 'hacker-news'     // Hacker News top stories
  | 'product-hunt'    // Product Hunt trending products
  | 'devto-feed'      // DEV.to articles feed
  // Utility widgets
  | 'calculator'      // Simple calculator
  | 'stopwatch'       // Stopwatch/timer widget
  | 'json-formatter'  // JSON formatter and validator
  | 'base64-tool'     // Base64 encode/decode tool
  | 'text-tools'      // Text manipulation utilities
  | 'password-generator' // Secure password generator
  | 'lorem-ipsum'     // Lorem ipsum text generator
  | 'dice-roller'     // Random dice/number generator
  // Developer/Converter widgets
  | 'unit-converter'  // Unit conversion (length, weight, temperature, etc.)
  | 'currency-converter' // Currency conversion with rates
  | 'markdown-preview' // Markdown editor with live preview
  | 'regex-tester'    // Regular expression tester
  | 'color-converter' // Color format converter (HEX, RGB, HSL)
  | 'timezone-converter' // Timezone conversion
  | 'hash-generator'  // Hash generator (MD5, SHA-1, SHA-256)
  | 'ip-info'         // IP address and network info
  // Generator/Calculator widgets
  | 'uuid-generator'  // UUID v1/v4 generator
  | 'number-converter' // Binary/Decimal/Hex/Octal converter
  | 'gradient-generator' // CSS gradient generator
  | 'box-shadow-generator' // CSS box-shadow generator
  | 'clip-path-generator' // CSS clip-path generator
  | 'aspect-ratio'    // Aspect ratio calculator
  | 'jwt-decoder'     // JWT token decoder
  | 'age-calculator'  // Age calculator from birthdate
  | 'word-counter'    // Word/character counter
  | 'text-shadow-generator' // CSS text-shadow generator
  | 'contrast-checker' // WCAG color contrast checker
  | 'spacing-calculator' // Spacing/scale calculator for web design
  | 'flexbox-playground' // CSS Flexbox visual playground
  | 'glassmorphism'   // Glassmorphism CSS generator
  | 'neumorphism'     // Neumorphism (Soft UI) CSS generator
  | 'svg-wave'        // SVG wave/divider generator
  | 'css-animation'   // CSS animation/keyframe generator
  | 'tailwind-colors' // Tailwind CSS color picker/browser
  | 'css-filter'      // CSS filter property generator
  | 'css-transform'   // CSS transform property generator
  | 'css-grid'        // CSS Grid visual generator
  | 'typography-scale' // Typography scale calculator for web designers
  | 'easing-functions' // Easing functions visualizer for game developers
  | 'state-machine'   // Game state machine visualizer/editor
  | 'rpg-stats'       // RPG Stats/Damage Calculator for game designers
  | 'sprite-sheet'    // Sprite sheet cutter and animation previewer
  | 'frame-rate'      // Frame rate/time calculator for game optimization
  | 'loot-table'      // Loot table/drop rate calculator for game designers
  | 'screen-resolution' // Screen resolution calculator for game developers
  | 'pixel-art'       // Pixel art canvas for game asset sketching
  | 'bezier-curve'    // Bezier curve editor for game paths and animations
  | 'color-ramp'      // Color ramp/gradient generator for game art
  | 'game-math'       // Game math reference (vectors, trigonometry, etc.)
  | 'noise-generator' // Procedural noise generator (Perlin, Simplex, etc.)
  | 'particle-system' // Particle system designer/previewer
  | 'tilemap-editor' // Tilemap/level editor for 2D games
  | 'hitbox-editor' // Visual hitbox/collision box editor for game sprites
  | 'quest-designer' // Quest/Mission structure designer for RPGs
  | 'health-bar' // HP/MP/Stamina bar visual designer
  | 'pathfinding' // Pathfinding algorithm visualizer
  | 'behavior-tree' // Behavior tree editor for Game AI
  | 'input-mapper' // Game controller input mapping designer
  | 'wave-spawner' // Enemy wave pattern designer for game development
  | 'achievement' // Achievement/Trophy System Designer
  | 'physics-playground' // 2D Physics simulation playground
  | 'inventory-grid' // Inventory System Designer (Resident Evil 4 style)
  | 'dialogue-tree' // Dialogue system editor for RPG conversations
  | 'skill-tree' // Skill tree editor for character progression
  | 'camera-shake' // Camera shake effect designer
  | 'damage-calculator' // Damage formula calculator for combat systems
  | 'level-progress' // Level progression curve designer
  | 'name-generator' // Random name generator for game characters
  // Organization & Productivity widgets for Design & Development
  | 'design-tokens'    // Design system tokens manager (colors, typography, spacing)
  | 'code-snippets'    // Code snippets library with syntax highlighting
  | 'sprint-tasks'     // Sprint/kanban task board for agile workflows
  | 'decision-log'     // Architecture Decision Records (ADR) tracker
  | 'eisenhower-matrix' // Priority quadrant matrix (urgent/important)
  | 'standup-notes'    // Daily standup notes template
  | 'mood-board'       // Design inspiration collector with images
  | 'api-reference'    // API endpoints quick reference documentation
  | 'meeting-notes'    // Structured meeting notes with action items
  | 'weekly-goals'     // Weekly OKR/goal setting and tracking
  | 'parking-lot'      // Ideas and features backlog
  | 'pr-checklist'     // Pull request review checklist
  | 'tech-debt'        // Technical debt tracker with priority
  | 'project-timeline' // Project milestones and timeline visualization
  | 'component-docs'   // Component library documentation reference
  | 'wireframe'        // Quick wireframing and sketching tool
  | 'design-review'    // Design review checklist
  | 'env-vars'         // Environment variables reference manager
  | 'git-commands'     // Git commands cheatsheet and quick reference
  | 'shadcn-builder'   // shadcn/ui component builder and theme configurator
  // Wellness & Life Tracking widgets
  | 'mood-tracker'     // Daily mood tracking with emojis and notes
  | 'water-intake'     // Track daily water consumption
  | 'sleep-log'        // Track sleep hours and patterns
  | 'breathing-exercise' // Guided breathing exercises with animations
  | 'gratitude-journal' // Daily gratitude logging
  | 'daily-affirmations' // Random positive affirmations
  // Finance widgets
  | 'expense-tracker'  // Quick expense logging by category
  | 'budget-progress'  // Category budget tracking with progress bars
  | 'savings-goal'     // Savings goals tracker
  | 'subscription-manager' // Track subscriptions and renewals
  // Advanced Productivity widgets
  | 'focus-score'      // Daily focus tracking based on pomodoro
  | 'time-blocking'    // Visual time blocks for day planning
  | 'daily-review'     // End of day review template
  | 'parking-lot-enhanced' // Ideas backlog with voting
  | 'energy-tracker'   // Energy levels through the day
  // Entertainment & Media widgets
  | 'movie-tracker'    // Movies/shows to watch, watching, watched
  | 'book-tracker'     // Book reading tracker with progress
  | 'anime-list'       // Anime/manga tracker
  | 'game-backlog'     // Video game backlog
  | 'wishlist'         // General wishlist with prices
  // AI & Intelligence widgets
  | 'ai-chat'          // Simple AI chat interface
  | 'ai-daily-summary' // Activity summary placeholder
  | 'smart-suggestions' // Link recommendations
  // Additional Social & News Feed widget
  | 'reddit-widget'    // Reddit posts viewer (alternative)
  // Design & Creativity widgets
  | 'color-of-day'     // Daily featured color with palettes
  | 'font-pairing'     // Typography combinations
  | 'design-inspiration' // Random design inspiration
  | 'icon-picker'      // Icon browser and search
  | 'screenshot-mockup' // Quick device mockup generator
  // Utility widgets (new)
  | 'clipboard-history' // Clipboard manager
  | 'sticky-notes'     // Post-it style notes
  | 'link-previewer'   // URL metadata preview
  | 'site-status'      // Multi-site uptime checker
  | 'api-tester'       // Quick REST API tester
  | 'cron-builder'     // Cron expression builder
  | 'diff-viewer';     // Text diff comparison

export type WidgetSize = 'small' | 'medium' | 'large' | 'wide' | 'tall';

// Kanban column definition - re-exported from kanban-store for convenience
// The main definition is in @/stores/kanban-store
export type { KanbanColumn } from '@/stores/kanban-store';
export { DEFAULT_KANBAN_COLUMNS, COLUMN_COLOR_PRESETS } from '@/stores/kanban-store';

// Default kanban card height
export const DEFAULT_KANBAN_HEIGHT = 280;
export const MIN_KANBAN_HEIGHT = 150;
export const MAX_KANBAN_HEIGHT = 600;

import type { WidgetConfig } from './configs';

export interface Widget {
  id: string;
  type: WidgetType;
  title: string;
  size: WidgetSize;
  projectId?: string | null; // Project this widget belongs to (null = Home view)
  categoryId?: string; // For category-type widgets
  tagId?: string; // For tag-type widgets (filter by tag)
  tags?: string[]; // Tags assigned to this widget for organization
  config?: WidgetConfig; // Additional config
  kanbanColumnId?: string; // For kanban view - which column this widget belongs to
  kanbanOrder?: number; // For kanban view - order within the column
  kanbanHeight?: number; // For kanban view - custom height in pixels (default: 280)
  // Visual customization
  backgroundColor?: string; // Custom background color (hex or CSS color)
  backgroundGradient?: string; // CSS gradient string
  accentColor?: string; // Accent color for borders/highlights
  opacity?: number; // Background opacity (0-1)
  isLocked?: boolean; // Prevent widget from being dragged/resized
  // Layout position (managed by react-grid-layout)
  layout: {
    x: number;
    y: number;
    w: number;
    h: number;
  };
}
