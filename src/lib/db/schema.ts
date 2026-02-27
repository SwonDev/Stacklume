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
    theme: varchar("theme", { length: 20 }).default("system").notNull(), // 'light', 'dark', 'system'
    viewDensity: varchar("view_density", { length: 20 }).default("normal").notNull(), // 'compact', 'normal', 'comfortable'
    viewMode: varchar("view_mode", { length: 20 }).default("bento").notNull(), // 'bento', 'kanban'
    showTooltips: boolCol("show_tooltips").default(true).notNull(),
    reduceMotion: boolCol("reduce_motion").default(false).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull().$defaultFn(() => new Date()),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull().$defaultFn(() => new Date()),
  },
  (table) => ({
    userIdIdx: uniqueIndex("idx_user_settings_user_id").on(table.userId),
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
