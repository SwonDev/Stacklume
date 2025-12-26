import { z } from 'zod';

// ============================================================================
// HELPER FUNCTION
// ============================================================================

/**
 * Validates request data against a Zod schema
 * Returns either success with typed data or failure with error messages
 */
export function validateRequest<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: string[] } {
  try {
    const validatedData = schema.parse(data);
    return { success: true, data: validatedData };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.issues.map(
        (issue) => `${issue.path.join('.')}: ${issue.message}`
      );
      return { success: false, errors };
    }
    return { success: false, errors: ['Unknown validation error'] };
  }
}

// ============================================================================
// COMMON SCHEMAS
// ============================================================================

// UUID validation
const uuidSchema = z.string().uuid('Invalid UUID format');

// Optional UUID (can be null or undefined)
const optionalUuidSchema = z.string().uuid('Invalid UUID format').nullable().optional();

// URL validation - must be valid URL format
const urlSchema = z
  .string()
  .min(1, 'URL is required')
  .url('Must be a valid URL');

// URL validation with protocol requirement (http/https)
const httpUrlSchema = z
  .string()
  .min(1, 'URL is required')
  .url('Must be a valid URL')
  .refine(
    (url) => url.startsWith('http://') || url.startsWith('https://'),
    'URL must start with http:// or https://'
  );

// Color hex validation
const _colorSchema = z
  .string()
  .regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Must be a valid hex color')
  .optional();

// Timestamp/ISO date string
const isoDateSchema = z.string().datetime('Must be a valid ISO date string');

// ============================================================================
// LINKS SCHEMAS
// ============================================================================

// Optional URL schema that allows null/undefined (for scraped data that may not have images)
const optionalNullableUrlSchema = z
  .string()
  .url('Must be a valid URL')
  .nullable()
  .optional();

// Create link request body
export const createLinkSchema = z.object({
  url: urlSchema,
  title: z.string().min(1, 'Title is required').max(255, 'Title must be 255 characters or less'),
  description: z.string().optional(),
  imageUrl: optionalNullableUrlSchema,
  faviconUrl: optionalNullableUrlSchema,
  categoryId: optionalUuidSchema,
  isFavorite: z.boolean().default(false),
  siteName: z.string().max(100, 'Site name must be 100 characters or less').nullable().optional(),
  author: z.string().max(100, 'Author must be 100 characters or less').nullable().optional(),
  publishedAt: isoDateSchema.nullable().optional(),
  source: z.string().max(50, 'Source must be 50 characters or less').nullable().optional(),
  sourceId: z.string().max(100, 'Source ID must be 100 characters or less').nullable().optional(),
  platform: z.string().max(50, 'Platform must be 50 characters or less').nullable().optional(),
  contentType: z.string().max(30, 'Content type must be 30 characters or less').nullable().optional(),
  platformColor: z.string().max(20, 'Platform color must be 20 characters or less').nullable().optional(),
});

// Update link request body (all fields optional except ID)
export const updateLinkSchema = z.object({
  url: urlSchema.optional(),
  title: z.string().min(1, 'Title cannot be empty').max(255, 'Title must be 255 characters or less').optional(),
  description: z.string().nullable().optional(),
  imageUrl: urlSchema.nullable().optional(),
  faviconUrl: urlSchema.nullable().optional(),
  categoryId: optionalUuidSchema,
  isFavorite: z.boolean().optional(),
  siteName: z.string().max(100, 'Site name must be 100 characters or less').nullable().optional(),
  author: z.string().max(100, 'Author must be 100 characters or less').nullable().optional(),
  publishedAt: isoDateSchema.nullable().optional(),
  source: z.string().max(50, 'Source must be 50 characters or less').nullable().optional(),
  sourceId: z.string().max(100, 'Source ID must be 100 characters or less').nullable().optional(),
  platform: z.string().max(50, 'Platform must be 50 characters or less').nullable().optional(),
  contentType: z.string().max(30, 'Content type must be 30 characters or less').nullable().optional(),
  platformColor: z.string().max(20, 'Platform color must be 20 characters or less').nullable().optional(),
});

// Link ID param
export const linkIdSchema = z.object({
  id: uuidSchema,
});

// ============================================================================
// CATEGORIES SCHEMAS
// ============================================================================

// Create category request body
export const createCategorySchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be 100 characters or less'),
  description: z.string().optional(),
  icon: z.string().max(50, 'Icon name must be 50 characters or less').optional(),
  color: z.string().max(20, 'Color must be 20 characters or less').optional(),
  order: z.number().int('Order must be an integer').default(0),
});

// Update category request body
export const updateCategorySchema = z.object({
  name: z.string().min(1, 'Name cannot be empty').max(100, 'Name must be 100 characters or less').optional(),
  description: z.string().nullable().optional(),
  icon: z.string().max(50, 'Icon name must be 50 characters or less').nullable().optional(),
  color: z.string().max(20, 'Color must be 20 characters or less').nullable().optional(),
  order: z.number().int('Order must be an integer').optional(),
});

// Category ID param
export const categoryIdSchema = z.object({
  id: uuidSchema,
});

// ============================================================================
// TAGS SCHEMAS
// ============================================================================

// Create tag request body
export const createTagSchema = z.object({
  name: z.string().min(1, 'Name is required').max(50, 'Name must be 50 characters or less'),
  color: z.string().max(20, 'Color must be 20 characters or less').optional(),
  order: z.number().int('Order must be an integer').default(0),
});

// Update tag request body
export const updateTagSchema = z.object({
  name: z.string().min(1, 'Name cannot be empty').max(50, 'Name must be 50 characters or less').optional(),
  color: z.string().max(20, 'Color must be 20 characters or less').nullable().optional(),
  order: z.number().int('Order must be an integer').optional(),
});

// Tag ID param
export const tagIdSchema = z.object({
  id: uuidSchema,
});

// Link-Tag association
export const linkTagAssociationSchema = z.object({
  linkId: uuidSchema,
  tagId: uuidSchema,
});

// ============================================================================
// WIDGETS SCHEMAS
// ============================================================================

// Valid widget types - must match WidgetType in @/types/widget.ts
const widgetTypeSchema = z.enum([
  // Core link widgets
  'favorites',
  'recent',
  'category',
  'tag',
  'categories',
  'quick-add',
  'stats',
  'link-analytics',
  'bookmarks',
  'search',
  'random-link',
  'link-manager',
  // Productivity widgets
  'clock',
  'notes',
  'progress',
  'image',
  'weather',
  'quote',
  'pomodoro',
  'calendar',
  'todo',
  'custom',
  'countdown',
  'habit-tracker',
  'tag-cloud',
  'github-activity',
  'bookmark-growth',
  'rss-feed',
  'reading-streak',
  // External data widgets
  'github-trending',
  'steam-games',
  'nintendo-deals',
  'github-search',
  'codepen',
  'spotify',
  'youtube',
  'crypto',
  'world-clock',
  'color-palette',
  'unsplash',
  'qr-code',
  'website-monitor',
  'embed',
  'prompt',
  'prompt-builder',
  'mcp-explorer',
  'deployment-status',
  'voice-notes',
  // Utility widgets
  'calculator',
  'stopwatch',
  'json-formatter',
  'base64-tool',
  'text-tools',
  'password-generator',
  'lorem-ipsum',
  'dice-roller',
  // Developer/Converter widgets
  'unit-converter',
  'currency-converter',
  'markdown-preview',
  'regex-tester',
  'color-converter',
  'timezone-converter',
  'hash-generator',
  'ip-info',
  // Generator/Calculator widgets
  'uuid-generator',
  'number-converter',
  'gradient-generator',
  'box-shadow-generator',
  'clip-path-generator',
  'aspect-ratio',
  'jwt-decoder',
  'age-calculator',
  'word-counter',
  'text-shadow-generator',
  'contrast-checker',
  'spacing-calculator',
  'flexbox-playground',
  'glassmorphism',
  'neumorphism',
  'svg-wave',
  'css-animation',
  'tailwind-colors',
  'css-filter',
  'css-transform',
  'css-grid',
  'typography-scale',
  // Game development widgets
  'easing-functions',
  'state-machine',
  'rpg-stats',
  'sprite-sheet',
  'frame-rate',
  'loot-table',
  'screen-resolution',
  'pixel-art',
  'bezier-curve',
  'color-ramp',
  'game-math',
  'noise-generator',
  'particle-system',
  'tilemap-editor',
  'hitbox-editor',
  'quest-designer',
  'health-bar',
  'pathfinding',
  'behavior-tree',
  'input-mapper',
  'wave-spawner',
  'achievement',
  'physics-playground',
  'inventory-grid',
  'dialogue-tree',
  'skill-tree',
  'camera-shake',
  'damage-calculator',
  'level-progress',
  'name-generator',
  // Organization & Productivity widgets
  'design-tokens',
  'code-snippets',
  'sprint-tasks',
  'decision-log',
  'eisenhower-matrix',
  'standup-notes',
  'mood-board',
  'api-reference',
  'meeting-notes',
  'weekly-goals',
  'parking-lot',
  'pr-checklist',
  'tech-debt',
  'project-timeline',
  'component-docs',
  'wireframe',
  'design-review',
  'env-vars',
  'git-commands',
  'shadcn-builder',
  // Social/News Feed widgets
  'twitter-feed',
  'reddit',
  'reddit-widget',
  'hacker-news',
  'product-hunt',
  'devto-feed',
  // Personal Finance widgets
  'expense-tracker',
  'budget-progress',
  'savings-goal',
  'subscription-manager',
  // AI & Intelligence widgets
  'ai-chat',
  'ai-daily-summary',
  'smart-suggestions',
  // Entertainment & Media widgets
  'movie-tracker',
  'book-tracker',
  'anime-list',
  'game-backlog',
  'wishlist',
  // Wellness & Life Tracking widgets
  'mood-tracker',
  'water-intake',
  'sleep-log',
  'breathing-exercise',
  'gratitude-journal',
  'daily-affirmations',
  // Design/Creativity widgets
  'color-of-day',
  'font-pairing',
  'design-inspiration',
  'icon-picker',
  'screenshot-mockup',
  // Productivity Extended widgets
  'focus-score',
  'time-blocking',
  'daily-review',
  'energy-tracker',
  'parking-lot-enhanced',
  // Utility Extended widgets
  'clipboard-history',
  'sticky-notes',
  'link-previewer',
  'site-status',
  'api-tester',
  'cron-builder',
  'diff-viewer',
  // Additional game development
  'tilemap',
] as const);

// Valid widget sizes
const widgetSizeSchema = z.enum(['small', 'medium', 'large', 'wide', 'tall']);

// Widget config schema (flexible object for different widget types)
const widgetConfigSchema = z.record(z.string(), z.unknown()).optional();

// Layout position schema
const _layoutPositionSchema = z.object({
  x: z.number().int('X position must be an integer').min(0, 'X position must be non-negative'),
  y: z.number().int('Y position must be an integer').min(0, 'Y position must be non-negative'),
  w: z.number().int('Width must be an integer').min(1, 'Width must be at least 1'),
  h: z.number().int('Height must be an integer').min(1, 'Height must be at least 1'),
});

// Create widget request body
export const createWidgetSchema = z.object({
  type: widgetTypeSchema,
  title: z.string().max(100, 'Title must be 100 characters or less').optional(),
  size: widgetSizeSchema.default('medium'),
  projectId: optionalUuidSchema,
  categoryId: optionalUuidSchema,
  tagId: optionalUuidSchema,
  tags: z.array(z.string()).optional(),
  config: widgetConfigSchema,
  layoutX: z.number().int('Layout X must be an integer').default(0),
  layoutY: z.number().int('Layout Y must be an integer').default(0),
  layoutW: z.number().int('Layout W must be an integer').default(2),
  layoutH: z.number().int('Layout H must be an integer').default(2),
  isVisible: z.boolean().default(true),
});

// Update widget request body
export const updateWidgetSchema = z.object({
  type: widgetTypeSchema.optional(),
  title: z.string().max(100, 'Title must be 100 characters or less').nullable().optional(),
  size: widgetSizeSchema.optional(),
  projectId: optionalUuidSchema,
  categoryId: optionalUuidSchema,
  tagId: optionalUuidSchema,
  tags: z.array(z.string()).nullable().optional(),
  config: widgetConfigSchema,
  layoutX: z.number().int('Layout X must be an integer').optional(),
  layoutY: z.number().int('Layout Y must be an integer').optional(),
  layoutW: z.number().int('Layout W must be an integer').optional(),
  layoutH: z.number().int('Layout H must be an integer').optional(),
  isVisible: z.boolean().optional(),
});

// Widget ID param
export const widgetIdSchema = z.object({
  id: uuidSchema,
});

// ============================================================================
// USER SETTINGS SCHEMAS
// ============================================================================

// Valid setting enums
const themeSchema = z.enum(['light', 'dark', 'system']);
const viewDensitySchema = z.enum(['compact', 'normal', 'comfortable']);
const viewModeSchema = z.enum(['bento', 'kanban', 'list']);

// Update settings request body
export const updateSettingsSchema = z.object({
  theme: themeSchema.optional(),
  viewDensity: viewDensitySchema.optional(),
  viewMode: viewModeSchema.optional(),
  showTooltips: z.boolean().optional(),
  reduceMotion: z.boolean().optional(),
});

// ============================================================================
// SCRAPE REQUEST SCHEMA
// ============================================================================

// Scrape URL metadata request
export const scrapeUrlSchema = z.object({
  url: httpUrlSchema,
});

// ============================================================================
// IMPORT DATA SCHEMAS
// ============================================================================

// Maximum limits for import operations
export const IMPORT_LIMITS = {
  MAX_LINKS_PER_IMPORT: 1000,
  MAX_CATEGORIES_PER_IMPORT: 100,
  MAX_TAGS_PER_IMPORT: 500,
  MAX_HTML_SIZE_BYTES: 10_000_000, // 10MB
} as const;

// Import link item (for JSON bulk import)
const importLinkItemSchema = z.object({
  url: urlSchema,
  title: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  imageUrl: urlSchema.optional(),
  faviconUrl: urlSchema.optional(),
  categoryId: optionalUuidSchema,
  isFavorite: z.boolean().optional(),
  siteName: z.string().max(100).optional(),
  author: z.string().max(100).optional(),
  publishedAt: isoDateSchema.optional(),
  source: z.string().max(50).optional(),
  sourceId: z.string().max(100).optional(),
  platform: z.string().max(50).optional(),
  contentType: z.string().max(30).optional(),
  platformColor: z.string().max(20).optional(),
  tags: z.array(z.string()).optional(), // Tag names for association
});

// Import category item
const importCategoryItemSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  icon: z.string().max(50).optional(),
  color: z.string().max(20).optional(),
  order: z.number().int().optional(),
});

// Import tag item
const importTagItemSchema = z.object({
  name: z.string().min(1).max(50),
  color: z.string().max(20).optional(),
  order: z.number().int().optional(),
});

// Link-tag association for import
const importLinkTagSchema = z.object({
  linkId: z.string(), // Original link ID from export
  tagId: z.string(),  // Original tag ID from export
});

// Full import data schema (JSON backup)
export const importDataSchema = z.object({
  links: z
    .array(importLinkItemSchema)
    .max(IMPORT_LIMITS.MAX_LINKS_PER_IMPORT, `Maximum ${IMPORT_LIMITS.MAX_LINKS_PER_IMPORT} links allowed per import`)
    .default([]),
  categories: z
    .array(importCategoryItemSchema)
    .max(IMPORT_LIMITS.MAX_CATEGORIES_PER_IMPORT, `Maximum ${IMPORT_LIMITS.MAX_CATEGORIES_PER_IMPORT} categories allowed per import`)
    .default([]),
  tags: z
    .array(importTagItemSchema)
    .max(IMPORT_LIMITS.MAX_TAGS_PER_IMPORT, `Maximum ${IMPORT_LIMITS.MAX_TAGS_PER_IMPORT} tags allowed per import`)
    .default([]),
  linkTags: z.array(importLinkTagSchema).optional(), // Optional link-tag associations
});

// ============================================================================
// BULK IMPORT SCHEMAS (simplified for quick imports)
// ============================================================================

// Schema for a single imported link (simplified version for bulk URL imports)
export const importedLinkSchema = z.object({
  url: z.string().url('Invalid URL format'),
  title: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional(),
  categoryId: z.string().uuid('Invalid category ID').optional().nullable(),
  tagIds: z.array(z.string().uuid('Invalid tag ID')).optional(),
  isFavorite: z.boolean().optional(),
});

// Schema for bulk link import
export const bulkImportSchema = z.object({
  links: z
    .array(importedLinkSchema)
    .min(1, 'At least one link is required')
    .max(IMPORT_LIMITS.MAX_LINKS_PER_IMPORT, `Maximum ${IMPORT_LIMITS.MAX_LINKS_PER_IMPORT} links allowed per import`),
});

// ============================================================================
// HTML IMPORT SCHEMA
// ============================================================================

// Schema for HTML bookmark import
export const htmlImportSchema = z.object({
  html: z
    .string()
    .min(1, 'HTML content is required')
    .max(IMPORT_LIMITS.MAX_HTML_SIZE_BYTES, `HTML content exceeds maximum size of ${IMPORT_LIMITS.MAX_HTML_SIZE_BYTES / 1_000_000}MB`),
});

// ============================================================================
// PROJECTS SCHEMAS
// ============================================================================

// Create project request body
export const createProjectSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be 100 characters or less'),
  description: z.string().nullable().optional(),
  icon: z.string().max(50, 'Icon name must be 50 characters or less').default('Folder'),
  color: z.string().max(20, 'Color must be 20 characters or less').default('#6366f1'),
  order: z.number().int('Order must be an integer').default(0),
  isDefault: z.boolean().default(false),
});

// Update project request body
export const updateProjectSchema = z.object({
  name: z.string().min(1, 'Name cannot be empty').max(100, 'Name must be 100 characters or less').optional(),
  description: z.string().nullable().optional(),
  icon: z.string().max(50, 'Icon name must be 50 characters or less').optional(),
  color: z.string().max(20, 'Color must be 20 characters or less').optional(),
  order: z.number().int('Order must be an integer').optional(),
  isDefault: z.boolean().optional(),
});

// Project ID param
export const projectIdSchema = z.object({
  id: uuidSchema,
});

// ============================================================================
// LAYOUT SCHEMAS
// ============================================================================

// Layout item for react-grid-layout
const layoutItemSchema = z.object({
  i: z.string(), // Widget ID
  x: z.number().int().min(0),
  y: z.number().int().min(0),
  w: z.number().int().min(1),
  h: z.number().int().min(1),
  minW: z.number().int().min(1).optional(),
  minH: z.number().int().min(1).optional(),
  maxW: z.number().int().optional(),
  maxH: z.number().int().optional(),
  static: z.boolean().optional(),
});

// Save layout request body
export const saveLayoutSchema = z.object({
  userId: z.string().max(100).default('default'),
  layoutData: z.array(layoutItemSchema).min(0),
});

// ============================================================================
// QUERY PARAMETER SCHEMAS
// ============================================================================

// Common pagination and filtering
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// Sorting
export const sortSchema = z.object({
  sortBy: z.enum(['createdAt', 'updatedAt', 'title', 'name']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// Link filtering
export const linkFilterSchema = z.object({
  categoryId: z.string().uuid().optional(),
  tagId: z.string().uuid().optional(),
  isFavorite: z.coerce.boolean().optional(),
  platform: z.string().optional(),
  contentType: z.string().optional(),
  search: z.string().optional(),
});

// ============================================================================
// INFERRED TYPES (for TypeScript usage)
// ============================================================================

// Links
export type CreateLinkInput = z.infer<typeof createLinkSchema>;
export type UpdateLinkInput = z.infer<typeof updateLinkSchema>;
export type LinkIdInput = z.infer<typeof linkIdSchema>;

// Categories
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
export type CategoryIdInput = z.infer<typeof categoryIdSchema>;

// Tags
export type CreateTagInput = z.infer<typeof createTagSchema>;
export type UpdateTagInput = z.infer<typeof updateTagSchema>;
export type TagIdInput = z.infer<typeof tagIdSchema>;
export type LinkTagAssociationInput = z.infer<typeof linkTagAssociationSchema>;

// Widgets
export type CreateWidgetInput = z.infer<typeof createWidgetSchema>;
export type UpdateWidgetInput = z.infer<typeof updateWidgetSchema>;
export type WidgetIdInput = z.infer<typeof widgetIdSchema>;

// Settings
export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;

// Scrape
export type ScrapeUrlInput = z.infer<typeof scrapeUrlSchema>;

// Import
export type ImportDataInput = z.infer<typeof importDataSchema>;
export type ImportLinkItem = z.infer<typeof importLinkItemSchema>;
export type ImportCategoryItem = z.infer<typeof importCategoryItemSchema>;
export type ImportTagItem = z.infer<typeof importTagItemSchema>;
export type ImportedLinkInput = z.infer<typeof importedLinkSchema>;
export type BulkImportInput = z.infer<typeof bulkImportSchema>;
export type HtmlImportInput = z.infer<typeof htmlImportSchema>;

// Projects
export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
export type ProjectIdInput = z.infer<typeof projectIdSchema>;

// Layout
export type SaveLayoutInput = z.infer<typeof saveLayoutSchema>;
export type LayoutItemInput = z.infer<typeof layoutItemSchema>;

// Query params
export type PaginationInput = z.infer<typeof paginationSchema>;
export type SortInput = z.infer<typeof sortSchema>;
export type LinkFilterInput = z.infer<typeof linkFilterSchema>;
