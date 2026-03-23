import {
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
  integer,
  json,
  primaryKey,
  index,
  uniqueIndex,
  customType,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// Columna boolean compatible con SQLite (convierte 0/1 a true/false)
// En PostgreSQL ya devuelve boolean, en SQLite devuelve 0/1 sin esta normalización
const boolCol = customType<{ data: boolean; driverData: boolean | number }>({
  dataType() {
    return "boolean";
  },
  fromDriver(value) {
    return Boolean(value);
  },
});

// Type for OAuth account types (matches NextAuth adapter expectations)
type AdapterAccountType = "oauth" | "oidc" | "email" | "webauthn";

// =====================
// AUTHENTICATION TABLES
// =====================

// Users table - for authentication
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }),
  email: varchar("email", { length: 255 }).notNull().unique(),
  emailVerified: timestamp("email_verified", { mode: "date", withTimezone: true }),
  image: text("image"),
  password: text("password"), // For credentials provider (bcrypt hashed)
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull().$defaultFn(() => new Date()),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull().$defaultFn(() => new Date()),
});

// Accounts table - for OAuth providers (NextAuth)
export const accounts = pgTable(
  "accounts",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: varchar("type", { length: 255 }).$type<AdapterAccountType>().notNull(),
    provider: varchar("provider", { length: 255 }).notNull(),
    providerAccountId: varchar("provider_account_id", { length: 255 }).notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: varchar("token_type", { length: 255 }),
    scope: varchar("scope", { length: 255 }),
    id_token: text("id_token"),
    session_state: varchar("session_state", { length: 255 }),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.provider, table.providerAccountId] }),
    userIdIdx: index("idx_accounts_user_id").on(table.userId),
  })
);

// Sessions table - for NextAuth sessions
export const sessions = pgTable(
  "sessions",
  {
    sessionToken: varchar("session_token", { length: 255 }).primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expires: timestamp("expires", { mode: "date", withTimezone: true }).notNull(),
  },
  (table) => ({
    userIdIdx: index("idx_sessions_user_id").on(table.userId),
  })
);

// Verification tokens table - for email verification
export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: varchar("identifier", { length: 255 }).notNull(),
    token: varchar("token", { length: 255 }).notNull(),
    expires: timestamp("expires", { mode: "date", withTimezone: true }).notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.identifier, table.token] }),
  })
);

// Auth relations
export const usersRelations = relations(users, ({ many }) => ({
  accounts: many(accounts),
  sessions: many(sessions),
  links: many(links),
  categories: many(categories),
  tags: many(tags),
  widgets: many(widgets),
  projects: many(projects),
}));

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, {
    fields: [accounts.userId],
    references: [users.id],
  }),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));

// =====================
// APPLICATION TABLES
// =====================

// Categories table - for organizing links
export const categories = pgTable(
  "categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }), // Nullable for backward compatibility
    name: varchar("name", { length: 100 }).notNull(),
    description: text("description"),
    icon: varchar("icon", { length: 50 }), // Lucide icon name
    color: varchar("color", { length: 20 }), // Color for the category badge
    order: integer("order").default(0).notNull(), // For sorting in sidebar
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull().$defaultFn(() => new Date()),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull().$defaultFn(() => new Date()),
    deletedAt: timestamp("deleted_at", { withTimezone: true }), // Soft delete timestamp
    parentCategoryId: uuid("parent_category_id"), // For nested categories
  },
  (table) => ({
    nameIdx: index("idx_categories_name").on(table.name),
    userIdIdx: index("idx_categories_user_id").on(table.userId),
  })
);

// Links table - main content storage
export const links = pgTable(
  "links",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }), // Nullable for backward compatibility
    url: text("url").notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    description: text("description"),
    imageUrl: text("image_url"),
    faviconUrl: text("favicon_url"),
    categoryId: uuid("category_id").references(() => categories.id, {
      onDelete: "set null",
    }),
    isFavorite: boolCol("is_favorite").default(false),
    // Metadata from scraping
    siteName: varchar("site_name", { length: 100 }),
    author: varchar("author", { length: 100 }),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    // Source info (e.g., "twitter", "github", "manual")
    source: varchar("source", { length: 50 }),
    sourceId: varchar("source_id", { length: 100 }), // Original ID from source
    // Platform detection info
    platform: varchar("platform", { length: 50 }), // youtube, steam, github, spotify, etc.
    contentType: varchar("content_type", { length: 30 }), // video, game, music, code, article, etc.
    platformColor: varchar("platform_color", { length: 20 }), // Brand color for UI
    // Order for custom sorting within category
    order: integer("order").default(0).notNull(),
    // Timestamps
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull().$defaultFn(() => new Date()),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull().$defaultFn(() => new Date()),
    deletedAt: timestamp("deleted_at", { withTimezone: true }), // Soft delete timestamp
    // Health check fields
    lastCheckedAt: timestamp("last_checked_at", { withTimezone: true }), // Last time the link was checked
    healthStatus: varchar("health_status", { length: 20 }), // ok, redirect, broken, timeout
    // Personal tracking fields
    isRead: boolCol("is_read").default(false),
    notes: text("notes"),
    reminderAt: timestamp("reminder_at", { withTimezone: true }),
    // Feature 5: Reading Queue
    readingStatus: varchar("reading_status", { length: 20 }).default("inbox"), // "inbox" | "reading" | "done"
    reviewAt: timestamp("review_at", { withTimezone: true }), // Para repetición espaciada
    // DevKit — comandos de instalación extraídos del HTML al guardar el enlace
    installCommands: text("install_commands"), // JSON string: string[]
    // Resumen generado por IA (2-3 oraciones)
    summary: text("summary"),
    // Etiquetas semánticas generadas por IA local (JSON array de strings)
    semanticTags: text("semantic_tags"),
  },
  (table) => ({
    userIdIdx: index("idx_links_user_id").on(table.userId),
    urlIdx: uniqueIndex("idx_links_url").on(table.url),
    categoryIdIdx: index("idx_links_category_id").on(table.categoryId),
    isFavoriteIdx: index("idx_links_is_favorite").on(table.isFavorite),
    createdAtIdx: index("idx_links_created_at").on(table.createdAt),
    platformIdx: index("idx_links_platform").on(table.platform),
    orderIdx: index("idx_links_order").on(table.order),
    // Performance indexes for soft delete and filtering queries
    deletedAtIdx: index("idx_links_deleted_at").on(table.deletedAt),
    healthStatusIdx: index("idx_links_health_status").on(table.healthStatus),
    // Composite index for category filtering with date sorting
    categoryCreatedAtIdx: index("idx_links_category_created_at").on(table.categoryId, table.createdAt),
    // Composite index for user filtering with date sorting
    userCreatedAtIdx: index("idx_links_user_created_at").on(table.userId, table.createdAt),
  })
);

// Tags table - for flexible tagging
export const tags = pgTable(
  "tags",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }), // Nullable for backward compatibility
    name: varchar("name", { length: 50 }).notNull(),
    color: varchar("color", { length: 20 }),
    order: integer("order").default(0).notNull(), // For sorting in sidebar
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull().$defaultFn(() => new Date()),
    deletedAt: timestamp("deleted_at", { withTimezone: true }), // Soft delete timestamp
  },
  (table) => ({
    userIdIdx: index("idx_tags_user_id").on(table.userId),
    // Unique constraint per user - allows same tag name for different users
    userNameIdx: uniqueIndex("idx_tags_user_name").on(table.userId, table.name),
  })
);

// Link-Tags junction table
export const linkTags = pgTable(
  "link_tags",
  {
    linkId: uuid("link_id")
      .notNull()
      .references(() => links.id, { onDelete: "cascade" }),
    tagId: uuid("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.linkId, table.tagId] }),
  })
);

// User Layout - stores the bento grid configuration
export const userLayouts = pgTable("user_layouts", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: varchar("user_id", { length: 100 }).default("default"), // For future multi-user support
  layoutData: json("layout_data").$type<LayoutItem[]>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull().$defaultFn(() => new Date()),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull().$defaultFn(() => new Date()),
});

// Projects table - for organizing widgets into separate workspaces
export const projects = pgTable("projects", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: varchar("user_id", { length: 100 }).default("default"),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  icon: varchar("icon", { length: 50 }).default("Folder"), // Lucide icon name
  color: varchar("color", { length: 20 }).default("#6366f1"), // Project accent color
  order: integer("order").default(0).notNull(), // For sorting projects in sidebar
  isDefault: boolCol("is_default").default(false), // Only one can be default (Home)
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull().$defaultFn(() => new Date()),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull().$defaultFn(() => new Date()),
  deletedAt: timestamp("deleted_at", { withTimezone: true }), // Soft delete timestamp
});

// Widget configurations for the bento grid
export const widgets = pgTable(
  "widgets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: varchar("user_id", { length: 100 }).default("default"), // For future multi-user support
    projectId: uuid("project_id").references(() => projects.id, { onDelete: "cascade" }), // null = Home/default view
    type: varchar("type", { length: 50 }).notNull(), // 'category', 'favorites', 'recent', 'search', 'stats', etc.
    title: varchar("title", { length: 100 }),
    size: varchar("size", { length: 20 }).default("medium").notNull(), // 'small', 'medium', 'large', 'wide', 'tall'
    categoryId: uuid("category_id").references(() => categories.id, { onDelete: "set null" }),
    tagId: uuid("tag_id").references(() => tags.id, { onDelete: "set null" }),
    tags: json("tags").$type<string[]>(), // Array of tag IDs for widget organization
    config: json("config").$type<WidgetConfig>(),
    // Layout position for react-grid-layout
    layoutX: integer("layout_x").default(0).notNull(),
    layoutY: integer("layout_y").default(0).notNull(),
    layoutW: integer("layout_w").default(2).notNull(),
    layoutH: integer("layout_h").default(2).notNull(),
    isVisible: boolCol("is_visible").default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull().$defaultFn(() => new Date()),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull().$defaultFn(() => new Date()),
    deletedAt: timestamp("deleted_at", { withTimezone: true }), // Soft delete timestamp
  },
  (table) => ({
    userIdIdx: index("idx_widgets_user_id").on(table.userId),
    projectIdIdx: index("idx_widgets_project_id").on(table.projectId),
  })
);

// User settings/preferences
export const userSettings = pgTable(
  "user_settings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: varchar("user_id", { length: 100 }).default("default").unique().notNull(),
    theme: varchar("theme", { length: 20 }).default("system").notNull(),
    viewDensity: varchar("view_density", { length: 20 }).default("normal").notNull(),
    viewMode: varchar("view_mode", { length: 20 }).default("bento").notNull(),
    showTooltips: boolCol("show_tooltips").default(true).notNull(),
    reduceMotion: boolCol("reduce_motion").default(false).notNull(),
    // MCP Server settings
    mcpEnabled: boolCol("mcp_enabled").default(false).notNull(),
    mcpApiKey: varchar("mcp_api_key", { length: 64 }),
    // Ollama AI local settings (solo desktop)
    ollamaEnabled: boolCol("ollama_enabled").default(false).notNull(),
    ollamaUrl: varchar("ollama_url", { length: 255 }).default("http://localhost:11434"),
    ollamaModel: varchar("ollama_model", { length: 100 }),
    // Extended settings
    language: varchar("language", { length: 5 }).default("es").notNull(),
    gridColumns: integer("grid_columns").default(12).notNull(),
    sidebarAlwaysVisible: boolCol("sidebar_always_visible").default(false).notNull(),
    defaultSortField: varchar("default_sort_field", { length: 20 }).default("createdAt").notNull(),
    defaultSortOrder: varchar("default_sort_order", { length: 4 }).default("desc").notNull(),
    thumbnailSize: varchar("thumbnail_size", { length: 10 }).default("medium").notNull(),
    sidebarDensity: varchar("sidebar_density", { length: 20 }).default("normal").notNull(),
    autoBackupInterval: integer("auto_backup_interval").default(0).notNull(),
    confirmBeforeDelete: boolCol("confirm_before_delete").default(true).notNull(),
    linkClickBehavior: varchar("link_click_behavior", { length: 20 }).default("new-tab").notNull(),
    onboardingCompleted: boolCol("onboarding_completed").default(false).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull().$defaultFn(() => new Date()),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull().$defaultFn(() => new Date()),
  },
  (table) => ({
    userIdIdx: uniqueIndex("idx_user_settings_user_id").on(table.userId),
  })
);

// Custom widget type definitions - created by users/AI via MCP
export const customWidgetTypes = pgTable(
  "custom_widget_types",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: varchar("user_id", { length: 100 }).default("default"),
    name: varchar("name", { length: 100 }).notNull(),
    description: text("description"),
    category: varchar("category", { length: 50 }).default("custom").notNull(),
    icon: varchar("icon", { length: 50 }).default("Puzzle").notNull(),
    htmlTemplate: text("html_template").notNull(), // Full HTML with {{CONFIG_JSON}} placeholder
    configSchema: json("config_schema"), // JSON Schema for config properties
    defaultConfig: json("default_config"), // Default config values
    defaultWidth: integer("default_width").default(2).notNull(),
    defaultHeight: integer("default_height").default(2).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull().$defaultFn(() => new Date()),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull().$defaultFn(() => new Date()),
    deletedAt: timestamp("deleted_at", { withTimezone: true }), // Soft delete
  },
  (table) => ({
    userIdIdx: index("idx_custom_widget_types_user_id").on(table.userId),
  })
);

// User backups - stores JSON backups of user data
export const userBackups = pgTable(
  "user_backups",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: varchar("user_id", { length: 100 }).default("default").notNull(),
    filename: varchar("filename", { length: 255 }).notNull(),
    size: integer("size").notNull(), // Size in bytes
    backupData: json("backup_data").$type<BackupData>().notNull(),
    backupType: varchar("backup_type", { length: 20 }).default("manual").notNull(), // 'manual', 'auto', 'export'
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull().$defaultFn(() => new Date()),
  },
  (table) => ({
    userIdIdx: index("idx_user_backups_user_id").on(table.userId),
    createdAtIdx: index("idx_user_backups_created_at").on(table.createdAt),
  })
);

// Relations
export const categoriesRelations = relations(categories, ({ one, many }) => ({
  user: one(users, {
    fields: [categories.userId],
    references: [users.id],
  }),
  links: many(links),
}));

export const linksRelations = relations(links, ({ one, many }) => ({
  user: one(users, {
    fields: [links.userId],
    references: [users.id],
  }),
  category: one(categories, {
    fields: [links.categoryId],
    references: [categories.id],
  }),
  linkTags: many(linkTags),
}));

export const tagsRelations = relations(tags, ({ one, many }) => ({
  user: one(users, {
    fields: [tags.userId],
    references: [users.id],
  }),
  linkTags: many(linkTags),
}));

export const linkTagsRelations = relations(linkTags, ({ one }) => ({
  link: one(links, {
    fields: [linkTags.linkId],
    references: [links.id],
  }),
  tag: one(tags, {
    fields: [linkTags.tagId],
    references: [tags.id],
  }),
}));

export const projectsRelations = relations(projects, ({ many }) => ({
  widgets: many(widgets),
}));

export const widgetsRelations = relations(widgets, ({ one }) => ({
  project: one(projects, {
    fields: [widgets.projectId],
    references: [projects.id],
  }),
  category: one(categories, {
    fields: [widgets.categoryId],
    references: [categories.id],
  }),
  tag: one(tags, {
    fields: [widgets.tagId],
    references: [tags.id],
  }),
}));

// Types - Auth
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Account = typeof accounts.$inferSelect;
export type NewAccount = typeof accounts.$inferInsert;
export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;
export type VerificationToken = typeof verificationTokens.$inferSelect;
export type NewVerificationToken = typeof verificationTokens.$inferInsert;

// Types - Application
export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;
export type Link = typeof links.$inferSelect;
export type NewLink = typeof links.$inferInsert;
export type Tag = typeof tags.$inferSelect;
export type NewTag = typeof tags.$inferInsert;
export type UserLayout = typeof userLayouts.$inferSelect;
export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;
export type Widget = typeof widgets.$inferSelect;
export type NewWidget = typeof widgets.$inferInsert;
export type UserSettings = typeof userSettings.$inferSelect;
export type NewUserSettings = typeof userSettings.$inferInsert;
export type LinkTag = typeof linkTags.$inferSelect;

// Layout item type for react-grid-layout
export interface LayoutItem {
  i: string; // Widget ID
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
  maxW?: number;
  maxH?: number;
  static?: boolean;
}

// Widget configuration type
export interface WidgetConfig {
  categoryId?: string;
  tagIds?: string[];
  limit?: number;
  sortBy?: "createdAt" | "title" | "updatedAt";
  sortOrder?: "asc" | "desc";
  showImages?: boolean;
  [key: string]: unknown;
}

// Backup data structure
export interface BackupData {
  version: string; // Backup format version
  exportedAt: string; // ISO timestamp
  data: {
    links?: Omit<Link, "userId">[];
    categories?: Omit<Category, "userId">[];
    tags?: Omit<Tag, "userId">[];
    linkTags?: { linkId: string; tagId: string }[];
    widgets?: Omit<Widget, "userId">[];
    projects?: Omit<Project, "userId">[];
    settings?: Partial<UserSettings>;
  };
}

// User backup types
export type UserBackup = typeof userBackups.$inferSelect;
export type NewUserBackup = typeof userBackups.$inferInsert;

// Custom widget type types
export type CustomWidgetType = typeof customWidgetTypes.$inferSelect;
export type NewCustomWidgetType = typeof customWidgetTypes.$inferInsert;

// ─── Saved Searches ─────────────────────────────────────────────────────────
export const savedSearches = pgTable("saved_searches", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").default("default"),
  name: varchar("name", { length: 255 }).notNull(),
  query: text("query").notNull(),
  filters: json("filters"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type SavedSearch = typeof savedSearches.$inferSelect;
export type NewSavedSearch = typeof savedSearches.$inferInsert;

// ─── Shared Collections ─────────────────────────────────────────────────────
export const sharedCollections = pgTable("shared_collections", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").default("default"),
  type: varchar("type", { length: 50 }).notNull(), // "category" | "tag" | "project"
  referenceId: text("reference_id").notNull(),
  shareToken: text("share_token").notNull().unique(),
  isActive: boolCol("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
}, (table) => [
  index("idx_shared_collections_token").on(table.shareToken),
]);

export type SharedCollection = typeof sharedCollections.$inferSelect;
export type NewSharedCollection = typeof sharedCollections.$inferInsert;

// ─── Link Categories (many-to-many) ─────────────────────────────────────────
export const linkCategories = pgTable("link_categories", {
  linkId: text("link_id").notNull(),
  categoryId: text("category_id").notNull(),
}, (table) => [
  primaryKey({ columns: [table.linkId, table.categoryId] }),
]);

// ─── Classification Rules ────────────────────────────────────────────────────
export const classificationRules = pgTable(
  "classification_rules",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").default("default"),
    name: varchar("name", { length: 100 }).notNull(),
    // Tipo de condición: url_pattern | title_keyword | platform | domain
    conditionType: varchar("condition_type", { length: 30 }).notNull(),
    // Valor de la condición: regex, keyword, nombre de plataforma o dominio
    conditionValue: text("condition_value").notNull(),
    // Acción: set_category | add_tag
    actionType: varchar("action_type", { length: 30 }).notNull(),
    // ID de la categoría o etiqueta a aplicar
    actionValue: text("action_value").notNull(),
    order: integer("order").default(0).notNull(),
    isActive: boolCol("is_active").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull().$defaultFn(() => new Date()),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull().$defaultFn(() => new Date()),
  },
  (table) => ({
    userIdIdx: index("idx_classification_rules_user_id").on(table.userId),
    orderIdx: index("idx_classification_rules_order").on(table.order),
  })
);

export type ClassificationRule = typeof classificationRules.$inferSelect;
export type NewClassificationRule = typeof classificationRules.$inferInsert;

// ─── Link Sessions (Feature 3: Session Launcher) ─────────────────────────────
export const linkSessions = pgTable(
  "link_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: varchar("user_id", { length: 100 }).default("default"),
    name: varchar("name", { length: 100 }).notNull(),
    description: text("description"),
    linkIds: json("link_ids").$type<string[]>().default([]).notNull(),
    order: integer("order").default(0).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull().$defaultFn(() => new Date()),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull().$defaultFn(() => new Date()),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => ({
    userIdIdx: index("idx_link_sessions_user_id").on(table.userId),
  })
);

export type LinkSession = typeof linkSessions.$inferSelect;
export type NewLinkSession = typeof linkSessions.$inferInsert;

// ─── Page Archives (Feature 4: Local Archiving) ───────────────────────────────
export const pageArchives = pgTable(
  "page_archives",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: varchar("user_id", { length: 100 }).default("default"),
    linkId: uuid("link_id").notNull().references(() => links.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 500 }),
    textContent: text("text_content"),
    htmlContent: text("html_content"), // HTML limpio para vista de lectura
    archivedAt: timestamp("archived_at", { withTimezone: true }).defaultNow().notNull().$defaultFn(() => new Date()),
    wordCount: integer("word_count").default(0).notNull(),
    size: integer("size").default(0).notNull(), // bytes
  },
  (table) => ({
    userIdIdx: index("idx_page_archives_user_id").on(table.userId),
    linkIdIdx: index("idx_page_archives_link_id").on(table.linkId),
  })
);

export type PageArchive = typeof pageArchives.$inferSelect;
export type NewPageArchive = typeof pageArchives.$inferInsert;

// ─── LLM Chat Sessions ─────────────────────────────────────────────────────────
export const llmChats = pgTable(
  "llm_chats",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: varchar("user_id", { length: 100 }).default("default"),
    title: varchar("title", { length: 500 }).notNull().default("Nueva conversación"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull().$defaultFn(() => new Date()),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull().$defaultFn(() => new Date()),
  },
  (table) => ({
    userIdIdx: index("idx_llm_chats_user_id").on(table.userId),
    updatedAtIdx: index("idx_llm_chats_updated_at").on(table.updatedAt),
  })
);

export const llmMessages = pgTable(
  "llm_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    chatId: uuid("chat_id").notNull().references(() => llmChats.id, { onDelete: "cascade" }),
    role: varchar("role", { length: 20 }).notNull(), // 'user' | 'assistant'
    content: text("content").notNull(),
    reasoningContent: text("reasoning_content"),
    isError: boolCol("is_error").default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull().$defaultFn(() => new Date()),
  },
  (table) => ({
    chatIdIdx: index("idx_llm_messages_chat_id").on(table.chatId),
  })
);

export type LlmChat = typeof llmChats.$inferSelect;
export type NewLlmChat = typeof llmChats.$inferInsert;
export type LlmMessage = typeof llmMessages.$inferSelect;
export type NewLlmMessage = typeof llmMessages.$inferInsert;
