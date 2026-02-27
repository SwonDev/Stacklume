/**
 * Schema Drizzle para SQLite (modo desktop)
 * Equivalente al schema PostgreSQL pero adaptado a SQLite.
 *
 * Diferencias clave:
 * - text().primaryKey() en lugar de uuid().primaryKey().defaultRandom()
 *   → Los UUIDs se generan en la app con crypto.randomUUID()
 * - integer({ mode: 'timestamp_ms' }) en lugar de timestamp()
 * - integer({ mode: 'boolean' }) en lugar de boolean()
 * - text({ mode: 'json' }) en lugar de json()
 */

import {
  sqliteTable,
  text,
  integer,
  primaryKey,
  index,
  uniqueIndex,
  real,
} from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";

// =====================
// AUTHENTICATION TABLES
// (Simplificadas para modo single-user sin NextAuth)
// =====================

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  name: text("name"),
  email: text("email").notNull().unique(),
  emailVerified: integer("email_verified", { mode: "timestamp_ms" }),
  image: text("image"),
  password: text("password"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});

export const accounts = sqliteTable(
  "accounts",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (table) => [
    primaryKey({ columns: [table.provider, table.providerAccountId] }),
    index("idx_accounts_user_id").on(table.userId),
  ]
);

export const sessions = sqliteTable(
  "sessions",
  {
    sessionToken: text("session_token").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expires: integer("expires", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [index("idx_sessions_user_id").on(table.userId)]
);

export const verificationTokens = sqliteTable(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: integer("expires", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [primaryKey({ columns: [table.identifier, table.token] })]
);

// Relaciones de auth
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
  user: one(users, { fields: [accounts.userId], references: [users.id] }),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
}));

// =====================
// APPLICATION TABLES
// =====================

export const categories = sqliteTable(
  "categories",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    icon: text("icon"),
    color: text("color"),
    order: integer("order").default(0).notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
    deletedAt: integer("deleted_at", { mode: "timestamp_ms" }),
  },
  (table) => [
    index("idx_categories_name").on(table.name),
    index("idx_categories_user_id").on(table.userId),
  ]
);

export const links = sqliteTable(
  "links",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").references(() => users.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    imageUrl: text("image_url"),
    faviconUrl: text("favicon_url"),
    categoryId: text("category_id").references(() => categories.id, {
      onDelete: "set null",
    }),
    isFavorite: integer("is_favorite", { mode: "boolean" }).default(false),
    siteName: text("site_name"),
    author: text("author"),
    publishedAt: integer("published_at", { mode: "timestamp_ms" }),
    source: text("source"),
    sourceId: text("source_id"),
    platform: text("platform"),
    contentType: text("content_type"),
    platformColor: text("platform_color"),
    order: integer("order").default(0).notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
    deletedAt: integer("deleted_at", { mode: "timestamp_ms" }),
    lastCheckedAt: integer("last_checked_at", { mode: "timestamp_ms" }),
    healthStatus: text("health_status"),
  },
  (table) => [
    index("idx_links_user_id").on(table.userId),
    uniqueIndex("idx_links_url").on(table.url),
    index("idx_links_category_id").on(table.categoryId),
    index("idx_links_is_favorite").on(table.isFavorite),
    index("idx_links_created_at").on(table.createdAt),
    index("idx_links_platform").on(table.platform),
    index("idx_links_order").on(table.order),
    index("idx_links_deleted_at").on(table.deletedAt),
    index("idx_links_health_status").on(table.healthStatus),
    index("idx_links_category_created_at").on(table.categoryId, table.createdAt),
    index("idx_links_user_created_at").on(table.userId, table.createdAt),
  ]
);

export const tags = sqliteTable(
  "tags",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    color: text("color"),
    order: integer("order").default(0).notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    deletedAt: integer("deleted_at", { mode: "timestamp_ms" }),
  },
  (table) => [
    index("idx_tags_user_id").on(table.userId),
    uniqueIndex("idx_tags_user_name").on(table.userId, table.name),
  ]
);

export const linkTags = sqliteTable(
  "link_tags",
  {
    linkId: text("link_id")
      .notNull()
      .references(() => links.id, { onDelete: "cascade" }),
    tagId: text("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
  },
  (table) => [primaryKey({ columns: [table.linkId, table.tagId] })]
);

export const userLayouts = sqliteTable("user_layouts", {
  id: text("id").primaryKey(),
  userId: text("user_id").default("default"),
  layoutData: text("layout_data", { mode: "json" })
    .$type<LayoutItem[]>()
    .notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});

export const projects = sqliteTable("projects", {
  id: text("id").primaryKey(),
  userId: text("user_id").default("default"),
  name: text("name").notNull(),
  description: text("description"),
  icon: text("icon").default("Folder"),
  color: text("color").default("#6366f1"),
  order: integer("order").default(0).notNull(),
  isDefault: integer("is_default", { mode: "boolean" }).default(false),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  deletedAt: integer("deleted_at", { mode: "timestamp_ms" }),
});

export const widgets = sqliteTable(
  "widgets",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").default("default"),
    projectId: text("project_id").references(() => projects.id, {
      onDelete: "cascade",
    }),
    type: text("type").notNull(),
    title: text("title"),
    size: text("size").default("medium").notNull(),
    categoryId: text("category_id").references(() => categories.id, {
      onDelete: "set null",
    }),
    tagId: text("tag_id").references(() => tags.id, { onDelete: "set null" }),
    tags: text("tags", { mode: "json" }).$type<string[]>(),
    config: text("config", { mode: "json" }).$type<WidgetConfig>(),
    layoutX: integer("layout_x").default(0).notNull(),
    layoutY: integer("layout_y").default(0).notNull(),
    layoutW: integer("layout_w").default(2).notNull(),
    layoutH: integer("layout_h").default(2).notNull(),
    isVisible: integer("is_visible", { mode: "boolean" }).default(true),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
    deletedAt: integer("deleted_at", { mode: "timestamp_ms" }),
  },
  (table) => [
    index("idx_widgets_user_id").on(table.userId),
    index("idx_widgets_project_id").on(table.projectId),
  ]
);

export const userSettings = sqliteTable(
  "user_settings",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").default("default").notNull(),
    theme: text("theme").default("system").notNull(),
    viewDensity: text("view_density").default("normal").notNull(),
    viewMode: text("view_mode").default("bento").notNull(),
    showTooltips: integer("show_tooltips", { mode: "boolean" })
      .default(true)
      .notNull(),
    reduceMotion: integer("reduce_motion", { mode: "boolean" })
      .default(false)
      .notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [
    uniqueIndex("idx_user_settings_user_id").on(table.userId),
  ]
);

export const userBackups = sqliteTable(
  "user_backups",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").default("default").notNull(),
    filename: text("filename").notNull(),
    size: integer("size").notNull(),
    backupData: text("backup_data", { mode: "json" })
      .$type<BackupData>()
      .notNull(),
    backupType: text("backup_type").default("manual").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [
    index("idx_user_backups_user_id").on(table.userId),
    index("idx_user_backups_created_at").on(table.createdAt),
  ]
);

// =====================
// RELACIONES
// =====================

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  user: one(users, {
    fields: [categories.userId],
    references: [users.id],
  }),
  links: many(links),
}));

export const linksRelations = relations(links, ({ one, many }) => ({
  user: one(users, { fields: [links.userId], references: [users.id] }),
  category: one(categories, {
    fields: [links.categoryId],
    references: [categories.id],
  }),
  linkTags: many(linkTags),
}));

export const tagsRelations = relations(tags, ({ one, many }) => ({
  user: one(users, { fields: [tags.userId], references: [users.id] }),
  linkTags: many(linkTags),
}));

export const linkTagsRelations = relations(linkTags, ({ one }) => ({
  link: one(links, { fields: [linkTags.linkId], references: [links.id] }),
  tag: one(tags, { fields: [linkTags.tagId], references: [tags.id] }),
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
  tag: one(tags, { fields: [widgets.tagId], references: [tags.id] }),
}));

// =====================
// TIPOS EXPORTADOS
// =====================

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;
export type Link = typeof links.$inferSelect;
export type NewLink = typeof links.$inferInsert;
export type Tag = typeof tags.$inferSelect;
export type NewTag = typeof tags.$inferInsert;
export type LinkTag = typeof linkTags.$inferSelect;
export type UserLayout = typeof userLayouts.$inferSelect;
export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;
export type Widget = typeof widgets.$inferSelect;
export type NewWidget = typeof widgets.$inferInsert;
export type UserSettings = typeof userSettings.$inferSelect;
export type NewUserSettings = typeof userSettings.$inferInsert;
export type UserBackup = typeof userBackups.$inferSelect;
export type NewUserBackup = typeof userBackups.$inferInsert;

// Tipo compartido con schema PostgreSQL
export interface LayoutItem {
  i: string;
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

export interface WidgetConfig {
  categoryId?: string;
  tagIds?: string[];
  limit?: number;
  sortBy?: "createdAt" | "title" | "updatedAt";
  sortOrder?: "asc" | "desc";
  showImages?: boolean;
  [key: string]: unknown;
}

export interface BackupData {
  version: string;
  exportedAt: string;
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

// Evitar error TS de módulo sin usar
export { real };
