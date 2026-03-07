/**
 * Handlers para las 23 herramientas MCP de Stacklume.
 * Cada función recibe `args` y devuelve un ToolResult compatible con JSON-RPC.
 */

import { z } from "zod";
import { db, withRetry, generateId } from "@/lib/db";
import {
  widgets,
  categories,
  tags,
  links,
  projects,
  userSettings,
  customWidgetTypes,
} from "@/lib/db/schema";
import { eq, isNull, and, desc } from "drizzle-orm";
import { BUILTIN_WIDGET_CATALOG, getWidgetCatalogText } from "./widget-schemas";
import {
  updateSettingsSchema,
} from "@/lib/validations";

// ─── MCP-specific Zod schemas ──────────────────────────────────────────────────

const uuidParam = z.string().uuid("Formato UUID inválido");
const optionalUuidParam = z.string().uuid("Formato UUID inválido").nullable().optional();

/** get_widget_type_schema */
const getWidgetTypeSchemaArgs = z.object({
  type: z.string().min(1, "El campo 'type' es obligatorio").max(100),
});

/** list_widgets */
const listWidgetsArgs = z.object({
  projectId: optionalUuidParam,
});

/** add_widget */
const addWidgetArgs = z.object({
  type: z.string().min(1, "El campo 'type' es obligatorio").max(100),
  size: z.enum(["small", "medium", "large", "wide", "tall"]).optional().default("medium"),
  title: z.string().max(200).nullable().optional(),
  config: z.union([z.record(z.string(), z.unknown()), z.string().max(500_000)]).nullable().optional(),
  projectId: optionalUuidParam,
});

/** update_widget */
const updateWidgetArgs = z.object({
  id: uuidParam,
  title: z.string().max(200).nullable().optional(),
  size: z.enum(["small", "medium", "large", "wide", "tall"]).optional(),
  config: z.union([z.record(z.string(), z.unknown()), z.string().max(500_000)]).nullable().optional(),
});

/** remove_widget */
const removeWidgetArgs = z.object({
  id: uuidParam,
});

/** create_custom_widget_type */
const createCustomWidgetTypeArgs = z.object({
  name: z.string().min(1, "El campo 'name' es obligatorio").max(200),
  description: z.string().max(1000).nullable().optional(),
  category: z.string().max(100).optional().default("custom"),
  icon: z.string().max(100).optional().default("Puzzle"),
  htmlTemplate: z.string().min(1, "El campo 'htmlTemplate' es obligatorio").max(500_000, "htmlTemplate debe ser menor a 500KB"),
  configSchema: z.record(z.string(), z.unknown()).nullable().optional(),
  defaultConfig: z.record(z.string(), z.unknown()).nullable().optional(),
  defaultWidth: z.number().int().min(1).max(12).optional().default(2),
  defaultHeight: z.number().int().min(1).max(12).optional().default(2),
});

/** update_custom_widget_type */
const updateCustomWidgetTypeArgs = z.object({
  id: uuidParam,
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).nullable().optional(),
  category: z.string().max(100).optional(),
  icon: z.string().max(100).optional(),
  htmlTemplate: z.string().min(1).max(500_000, "htmlTemplate debe ser menor a 500KB").optional(),
  configSchema: z.record(z.string(), z.unknown()).nullable().optional(),
  defaultConfig: z.record(z.string(), z.unknown()).nullable().optional(),
  defaultWidth: z.number().int().min(1).max(12).optional(),
  defaultHeight: z.number().int().min(1).max(12).optional(),
});

/** delete_custom_widget_type */
const deleteCustomWidgetTypeArgs = z.object({
  id: uuidParam,
});

/** add_custom_widget */
const addCustomWidgetArgs = z.object({
  customWidgetTypeId: z.string().min(1).optional(),
  customTypeId: z.string().min(1).optional(),
  title: z.string().max(200).nullable().optional(),
  config: z.union([z.record(z.string(), z.unknown()), z.string().max(500_000)]).nullable().optional(),
  projectId: optionalUuidParam,
});

/** export_custom_widget_type */
const exportCustomWidgetTypeArgs = z.object({
  id: uuidParam,
});

/** import_custom_widget_type */
const importCustomWidgetTypeArgs = z.object({
  data: z.object({
    stacklume_widget_type: z.literal("1.0"),
    name: z.string().min(1).max(200).optional(),
    description: z.string().max(1000).nullable().optional(),
    category: z.string().max(100).nullable().optional(),
    icon: z.string().max(100).nullable().optional(),
    htmlTemplate: z.string().min(1, "htmlTemplate es obligatorio").max(500_000, "htmlTemplate debe ser menor a 500KB"),
    configSchema: z.record(z.string(), z.unknown()).nullable().optional(),
    defaultConfig: z.record(z.string(), z.unknown()).nullable().optional(),
    defaultWidth: z.number().int().min(1).max(12).optional(),
    defaultHeight: z.number().int().min(1).max(12).optional(),
  }),
});

/** list_links */
const listLinksArgs = z.object({
  limit: z.number().int().min(1).max(200).optional().default(50),
});

/** add_link */
const addLinkArgs = z.object({
  url: z.string().min(1, "El campo 'url' es obligatorio").url("Debe ser una URL válida"),
  title: z.string().min(1, "El campo 'title' es obligatorio").max(255),
  description: z.string().max(5000).nullable().optional(),
  categoryId: optionalUuidParam,
  isFavorite: z.boolean().optional().default(false),
});

/** update_link */
const updateLinkArgs = z.object({
  id: uuidParam,
  title: z.string().min(1).max(255).optional(),
  description: z.string().max(5000).nullable().optional(),
  categoryId: optionalUuidParam,
  isFavorite: z.boolean().optional(),
});

/** delete_link */
const deleteLinkArgs = z.object({
  id: uuidParam,
});

/** update_settings — reuses existing schema from validations */
const updateSettingsMcpArgs = updateSettingsSchema;

const DEFAULT_USER_ID = "default";

export type ToolResult = {
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
};

function ok(data: unknown): ToolResult {
  return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
}

function err(message: string): ToolResult {
  return {
    content: [{ type: "text", text: JSON.stringify({ error: message }) }],
    isError: true,
  };
}

/**
 * Validates args against a Zod schema.
 * Returns parsed data on success, or a ToolResult error on failure.
 */
function validateArgs<T>(schema: z.ZodSchema<T>, args: unknown): { ok: true; data: T } | { ok: false; error: ToolResult } {
  const result = schema.safeParse(args);
  if (!result.success) {
    const issues = result.error.issues.map(
      (i) => `${i.path.length > 0 ? i.path.join(".") + ": " : ""}${i.message}`
    );
    return {
      ok: false,
      error: err(`Parámetros inválidos: ${issues.join("; ")}`),
    };
  }
  return { ok: true, data: result.data };
}

/** Mapeo de tamaño de widget a dimensiones de cuadrícula */
const SIZE_DIMS: Record<string, { w: number; h: number }> = {
  small: { w: 1, h: 1 },
  medium: { w: 2, h: 2 },
  large: { w: 4, h: 3 },
  wide: { w: 4, h: 2 },
  tall: { w: 2, h: 3 },
};

/** Convierte dimensiones de cuadrícula al nombre de tamaño más cercano. */
function sizeFromDims(w: number, h: number): string {
  if (w <= 1 && h <= 1) return "small";
  if (w >= 4 && h >= 3) return "large";
  if (w >= 4 && h <= 2) return "wide";
  if (w <= 2 && h >= 3) return "tall";
  return "medium";
}

/** Nota que se adjunta a toda respuesta de operación de widget. */
const WIDGET_UI_NOTE =
  "ACCIÓN REQUERIDA: Informa al usuario que debe refrescar la página (F5 / Ctrl+R / Cmd+R) para ver los cambios en el dashboard. El widget ya está guardado en la base de datos.";

// ─── Info general ──────────────────────────────────────────────────────────────

async function handleGetAppInfo(): Promise<ToolResult> {
  const [ws, ls, cs, ts, ps, cwt] = await Promise.all([
    withRetry(() => db.select({ id: widgets.id }).from(widgets).where(isNull(widgets.deletedAt)), { operationName: "count widgets" }),
    withRetry(() => db.select({ id: links.id }).from(links).where(isNull(links.deletedAt)), { operationName: "count links" }),
    withRetry(() => db.select({ id: categories.id }).from(categories).where(isNull(categories.deletedAt)), { operationName: "count categories" }),
    withRetry(() => db.select({ id: tags.id }).from(tags).where(isNull(tags.deletedAt)), { operationName: "count tags" }),
    withRetry(() => db.select({ id: projects.id }).from(projects).where(isNull(projects.deletedAt)), { operationName: "count projects" }),
    withRetry(() => db.select({ id: customWidgetTypes.id }).from(customWidgetTypes).where(isNull(customWidgetTypes.deletedAt)), { operationName: "count custom widget types" }),
  ]);
  return ok({
    app: "Stacklume",
    description: "Dashboard de gestión de enlaces y marcadores con bento grid de widgets personalizables",
    stats: {
      widgets: ws.length,
      links: ls.length,
      categories: cs.length,
      tags: ts.length,
      projects: ps.length,
      customWidgetTypes: cwt.length,
    },
    tips: [
      "Usa list_widget_types para ver todos los tipos de widget disponibles (190+)",
      "Usa add_widget con el type apropiado para añadir widgets al dashboard",
      "Usa create_custom_widget_type + add_custom_widget para widgets HTML/CSS/JS propios completamente funcionales",
      "Usa list_projects para ver los workspaces disponibles; projectId=null corresponde a la vista Home",
      "Usa list_links, list_categories y list_tags para conocer el contenido existente",
      "IMPORTANTE: tras cualquier operación de widget, el usuario debe refrescar la página (F5/Ctrl+R) para ver los cambios",
    ],
  });
}

// ─── Tipos de widget built-in ──────────────────────────────────────────────────

async function handleListWidgetTypes(): Promise<ToolResult> {
  return ok({
    total: BUILTIN_WIDGET_CATALOG.length,
    catalog: BUILTIN_WIDGET_CATALOG,
    summary: getWidgetCatalogText(),
  });
}

async function handleGetWidgetTypeSchema(args: Record<string, unknown>): Promise<ToolResult> {
  const v = validateArgs(getWidgetTypeSchemaArgs, args);
  if (!v.ok) return v.error;
  const { type } = v.data;
  const widget = BUILTIN_WIDGET_CATALOG.find((w) => w.type === type);
  if (!widget) {
    return err(`Tipo de widget '${type}' no encontrado. Usa list_widget_types para ver los disponibles.`);
  }
  return ok(widget);
}

// ─── Widgets (instancias) ──────────────────────────────────────────────────────

async function handleListWidgets(args: Record<string, unknown>): Promise<ToolResult> {
  const v = validateArgs(listWidgetsArgs, args);
  if (!v.ok) return v.error;
  const allWidgets = await withRetry(
    () => db.select().from(widgets).where(isNull(widgets.deletedAt)).orderBy(desc(widgets.createdAt)),
    { operationName: "list widgets" }
  );
  const projectId = v.data.projectId ?? undefined;
  const filtered = projectId
    ? allWidgets.filter((w) => w.projectId === projectId)
    : allWidgets;
  return ok(
    filtered.map((w) => ({
      id: w.id,
      type: w.type,
      title: w.title,
      size: w.size,
      projectId: w.projectId,
      config: w.config,
      layout: { x: w.layoutX, y: w.layoutY, w: w.layoutW, h: w.layoutH },
    }))
  );
}

async function handleAddWidget(args: Record<string, unknown>): Promise<ToolResult> {
  const v = validateArgs(addWidgetArgs, args);
  if (!v.ok) return v.error;
  const { type, size, title, projectId } = v.data;
  const dims = SIZE_DIMS[size] || { w: 2, h: 2 };

  // Parsear config si llegó como string JSON (error de algunos clientes MCP)
  let widgetConfig: Record<string, unknown> | null = null;
  if (v.data.config !== undefined && v.data.config !== null) {
    if (typeof v.data.config === "string") {
      try { widgetConfig = JSON.parse(v.data.config) as Record<string, unknown>; } catch { widgetConfig = null; }
    } else {
      widgetConfig = v.data.config || null;
    }
  }

  const [created] = await withRetry(
    () =>
      db
        .insert(widgets)
        .values({
          id: generateId(),
          userId: DEFAULT_USER_ID,
          type,
          title: title || null,
          size,
          config: widgetConfig,
          projectId: projectId || null,
          layoutX: 0,
          layoutY: 9999, // react-grid-layout lo reubica al final
          layoutW: dims.w,
          layoutH: dims.h,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning(),
    { operationName: "add widget" }
  );
  return ok({
    success: true,
    widget: { id: created.id, type: created.type, title: created.title, size: created.size },
    _ui_note: WIDGET_UI_NOTE,
  });
}

async function handleUpdateWidget(args: Record<string, unknown>): Promise<ToolResult> {
  const v = validateArgs(updateWidgetArgs, args);
  if (!v.ok) return v.error;
  const { id } = v.data;
  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (v.data.title !== undefined) updates.title = v.data.title;
  if (v.data.size !== undefined) {
    updates.size = v.data.size;
    const dims = SIZE_DIMS[v.data.size];
    if (dims) {
      updates.layoutW = dims.w;
      updates.layoutH = dims.h;
    }
  }
  if (v.data.config !== undefined) updates.config = v.data.config;

  const [updated] = await withRetry(
    () =>
      db
        .update(widgets)
        .set(updates as Parameters<typeof db.update>[0] extends { set: (v: infer V) => unknown } ? V : never)
        .where(and(eq(widgets.id, id), isNull(widgets.deletedAt)))
        .returning(),
    { operationName: "update widget" }
  );
  if (!updated) return err(`Widget '${id}' no encontrado`);
  return ok({ success: true, widget: { id: updated.id, type: updated.type, title: updated.title }, _ui_note: WIDGET_UI_NOTE });
}

async function handleRemoveWidget(args: Record<string, unknown>): Promise<ToolResult> {
  const v = validateArgs(removeWidgetArgs, args);
  if (!v.ok) return v.error;
  const { id } = v.data;
  await withRetry(
    () => db.update(widgets).set({ deletedAt: new Date() } as never).where(eq(widgets.id, id)),
    { operationName: "remove widget" }
  );
  return ok({ success: true, _ui_note: WIDGET_UI_NOTE });
}

// ─── Custom widget types ───────────────────────────────────────────────────────

async function handleListCustomWidgetTypes(): Promise<ToolResult> {
  const types = await withRetry(
    () =>
      db
        .select()
        .from(customWidgetTypes)
        .where(isNull(customWidgetTypes.deletedAt))
        .orderBy(desc(customWidgetTypes.createdAt)),
    { operationName: "list custom widget types" }
  );
  return ok(types);
}

async function handleCreateCustomWidgetType(args: Record<string, unknown>): Promise<ToolResult> {
  const v = validateArgs(createCustomWidgetTypeArgs, args);
  if (!v.ok) return v.error;
  const { name, description, category, icon, htmlTemplate, configSchema, defaultConfig, defaultWidth, defaultHeight } = v.data;

  const [created] = await withRetry(
    () =>
      db
        .insert(customWidgetTypes)
        .values({
          id: generateId(),
          userId: DEFAULT_USER_ID,
          name,
          description: description || null,
          category,
          icon,
          htmlTemplate,
          configSchema: configSchema || null,
          defaultConfig: defaultConfig || null,
          defaultWidth,
          defaultHeight,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning(),
    { operationName: "create custom widget type" }
  );
  return ok({
    success: true,
    customWidgetType: created,
    _next_step: `Tipo creado con id="${created.id}". Ahora llama a add_custom_widget con customWidgetTypeId="${created.id}" para colocarlo en el dashboard. Después pide al usuario que refresque la página (F5).`,
  });
}

async function handleUpdateCustomWidgetType(args: Record<string, unknown>): Promise<ToolResult> {
  const v = validateArgs(updateCustomWidgetTypeArgs, args);
  if (!v.ok) return v.error;
  const { id } = v.data;
  const updates: Record<string, unknown> = { updatedAt: new Date() };
  const fields = ["name", "description", "category", "icon", "htmlTemplate", "configSchema", "defaultConfig", "defaultWidth", "defaultHeight"] as const;
  for (const key of fields) {
    if (v.data[key] !== undefined) updates[key] = v.data[key];
  }
  const [updated] = await withRetry(
    () =>
      db
        .update(customWidgetTypes)
        .set(updates as never)
        .where(and(eq(customWidgetTypes.id, id), isNull(customWidgetTypes.deletedAt)))
        .returning(),
    { operationName: "update custom widget type" }
  );
  if (!updated) return err(`Tipo de widget personalizado '${id}' no encontrado`);
  return ok({ success: true, customWidgetType: updated });
}

async function handleDeleteCustomWidgetType(args: Record<string, unknown>): Promise<ToolResult> {
  const v = validateArgs(deleteCustomWidgetTypeArgs, args);
  if (!v.ok) return v.error;
  const { id } = v.data;
  await withRetry(
    () =>
      db
        .update(customWidgetTypes)
        .set({ deletedAt: new Date() } as never)
        .where(eq(customWidgetTypes.id, id)),
    { operationName: "delete custom widget type" }
  );
  return ok({ success: true });
}

async function handleAddCustomWidget(args: Record<string, unknown>): Promise<ToolResult> {
  const v = validateArgs(addCustomWidgetArgs, args);
  if (!v.ok) return v.error;

  // Acepta tanto 'customWidgetTypeId' (nombre preferido en el schema) como
  // 'customTypeId' (alias legado) para máxima compatibilidad con distintos clientes MCP.
  const customWidgetTypeId = (
    (v.data.customWidgetTypeId as string) ||
    (v.data.customTypeId as string) ||
    ""
  ).trim();

  if (!customWidgetTypeId) {
    return err(
      "Parámetro 'customWidgetTypeId' requerido. Pasa el campo 'id' exacto devuelto por create_custom_widget_type o list_custom_widget_types."
    );
  }

  // Si config llegó como JSON string (error de algunos clientes), lo parseamos.
  let parsedConfig: Record<string, unknown> | null = null;
  if (v.data.config !== undefined && v.data.config !== null) {
    if (typeof v.data.config === "string") {
      try {
        parsedConfig = JSON.parse(v.data.config) as Record<string, unknown>;
      } catch {
        parsedConfig = null;
      }
    } else {
      parsedConfig = (v.data.config as Record<string, unknown>) || null;
    }
  }

  const [type] = await withRetry(
    () =>
      db
        .select()
        .from(customWidgetTypes)
        .where(and(eq(customWidgetTypes.id, customWidgetTypeId), isNull(customWidgetTypes.deletedAt)))
        .limit(1),
    { operationName: "get custom widget type" }
  );
  if (!type) return err(`Tipo de widget personalizado '${customWidgetTypeId}' no encontrado. Usa list_custom_widget_types para ver los disponibles.`);

  const config: Record<string, unknown> = {
    _customTypeId: customWidgetTypeId,
    ...(parsedConfig || {}),
  };

  const derivedSize = sizeFromDims(type.defaultWidth, type.defaultHeight);

  const [created] = await withRetry(
    () =>
      db
        .insert(widgets)
        .values({
          id: generateId(),
          userId: DEFAULT_USER_ID,
          type: "custom-user",
          title: v.data.title || type.name,
          size: derivedSize,
          config,
          projectId: v.data.projectId || null,
          layoutX: 0,
          layoutY: 9999,
          layoutW: type.defaultWidth,
          layoutH: type.defaultHeight,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning(),
    { operationName: "add custom widget" }
  );
  return ok({
    success: true,
    widget: { id: created.id, type: "custom-user", title: created.title, size: derivedSize },
    _ui_note: WIDGET_UI_NOTE,
  });
}

async function handleExportCustomWidgetType(args: Record<string, unknown>): Promise<ToolResult> {
  const v = validateArgs(exportCustomWidgetTypeArgs, args);
  if (!v.ok) return v.error;
  const { id } = v.data;
  const [type] = await withRetry(
    () =>
      db
        .select()
        .from(customWidgetTypes)
        .where(and(eq(customWidgetTypes.id, id), isNull(customWidgetTypes.deletedAt)))
        .limit(1),
    { operationName: "export custom widget type" }
  );
  if (!type) return err(`Tipo de widget personalizado '${id}' no encontrado`);

  return ok({
    stacklume_widget_type: "1.0",
    name: type.name,
    description: type.description,
    category: type.category,
    icon: type.icon,
    htmlTemplate: type.htmlTemplate,
    configSchema: type.configSchema,
    defaultConfig: type.defaultConfig,
    defaultWidth: type.defaultWidth,
    defaultHeight: type.defaultHeight,
  });
}

async function handleImportCustomWidgetType(args: Record<string, unknown>): Promise<ToolResult> {
  const v = validateArgs(importCustomWidgetTypeArgs, args);
  if (!v.ok) return v.error;
  const { data } = v.data;
  const [created] = await withRetry(
    () =>
      db
        .insert(customWidgetTypes)
        .values({
          id: generateId(),
          userId: DEFAULT_USER_ID,
          name: data.name || "Widget importado",
          description: data.description || null,
          category: data.category || "custom",
          icon: data.icon || "Puzzle",
          htmlTemplate: data.htmlTemplate,
          configSchema: (data.configSchema as Record<string, unknown>) || null,
          defaultConfig: (data.defaultConfig as Record<string, unknown>) || null,
          defaultWidth: data.defaultWidth || 2,
          defaultHeight: data.defaultHeight || 2,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning(),
    { operationName: "import custom widget type" }
  );
  return ok({ success: true, customWidgetType: created });
}

// ─── Links ────────────────────────────────────────────────────────────────────

async function handleListLinks(args: Record<string, unknown>): Promise<ToolResult> {
  const v = validateArgs(listLinksArgs, args);
  if (!v.ok) return v.error;
  const limit = v.data.limit;
  const allLinks = await withRetry(
    () =>
      db
        .select({
          id: links.id,
          url: links.url,
          title: links.title,
          description: links.description,
          categoryId: links.categoryId,
          isFavorite: links.isFavorite,
          platform: links.platform,
          createdAt: links.createdAt,
        })
        .from(links)
        .where(isNull(links.deletedAt))
        .orderBy(desc(links.createdAt))
        .limit(limit),
    { operationName: "list links" }
  );
  return ok(allLinks);
}

async function handleAddLink(args: Record<string, unknown>): Promise<ToolResult> {
  const v = validateArgs(addLinkArgs, args);
  if (!v.ok) return v.error;
  const { url, title, description, categoryId, isFavorite } = v.data;
  const [created] = await withRetry(
    () =>
      db
        .insert(links)
        .values({
          id: generateId(),
          url,
          title,
          description: description || null,
          categoryId: categoryId || null,
          isFavorite: isFavorite,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning(),
    { operationName: "add link" }
  );
  return ok({ success: true, link: { id: created.id, url: created.url, title: created.title } });
}

async function handleUpdateLink(args: Record<string, unknown>): Promise<ToolResult> {
  const v = validateArgs(updateLinkArgs, args);
  if (!v.ok) return v.error;
  const { id } = v.data;
  const updates: Record<string, unknown> = { updatedAt: new Date() };
  for (const key of ["title", "description", "categoryId", "isFavorite"] as const) {
    if (v.data[key] !== undefined) updates[key] = v.data[key];
  }
  const [updated] = await withRetry(
    () =>
      db
        .update(links)
        .set(updates as never)
        .where(and(eq(links.id, id), isNull(links.deletedAt)))
        .returning(),
    { operationName: "update link" }
  );
  if (!updated) return err(`Enlace '${id}' no encontrado`);
  return ok({ success: true, link: { id: updated.id, url: updated.url, title: updated.title } });
}

async function handleDeleteLink(args: Record<string, unknown>): Promise<ToolResult> {
  const v = validateArgs(deleteLinkArgs, args);
  if (!v.ok) return v.error;
  const { id } = v.data;
  await withRetry(
    () => db.update(links).set({ deletedAt: new Date() } as never).where(eq(links.id, id)),
    { operationName: "delete link" }
  );
  return ok({ success: true });
}

// ─── Contexto (solo lectura) ───────────────────────────────────────────────────

async function handleListCategories(): Promise<ToolResult> {
  const all = await withRetry(
    () =>
      db
        .select({ id: categories.id, name: categories.name, color: categories.color, icon: categories.icon })
        .from(categories)
        .where(isNull(categories.deletedAt))
        .orderBy(categories.order),
    { operationName: "list categories" }
  );
  return ok(all);
}

async function handleListTags(): Promise<ToolResult> {
  const all = await withRetry(
    () =>
      db
        .select({ id: tags.id, name: tags.name, color: tags.color })
        .from(tags)
        .where(isNull(tags.deletedAt))
        .orderBy(tags.order),
    { operationName: "list tags" }
  );
  return ok(all);
}

async function handleListProjects(): Promise<ToolResult> {
  const all = await withRetry(
    () =>
      db
        .select({ id: projects.id, name: projects.name, icon: projects.icon, color: projects.color })
        .from(projects)
        .where(isNull(projects.deletedAt))
        .orderBy(projects.order),
    { operationName: "list projects" }
  );
  return ok(all);
}

// ─── Settings ─────────────────────────────────────────────────────────────────

async function handleGetSettings(): Promise<ToolResult> {
  const [s] = await withRetry(
    () => db.select().from(userSettings).where(eq(userSettings.userId, DEFAULT_USER_ID)),
    { operationName: "get settings" }
  );
  if (!s) {
    return ok({ theme: "system", viewDensity: "normal", viewMode: "bento", showTooltips: true, reduceMotion: false });
  }
  return ok({
    theme: s.theme,
    viewDensity: s.viewDensity,
    viewMode: s.viewMode,
    showTooltips: s.showTooltips,
    reduceMotion: s.reduceMotion,
  });
}

async function handleUpdateSettings(args: Record<string, unknown>): Promise<ToolResult> {
  const v = validateArgs(updateSettingsMcpArgs, args);
  if (!v.ok) return v.error;
  const updates: Record<string, unknown> = { updatedAt: new Date() };
  for (const key of ["theme", "viewDensity", "viewMode", "showTooltips", "reduceMotion"] as const) {
    if (v.data[key] !== undefined) updates[key] = v.data[key];
  }
  await withRetry(
    () =>
      db
        .update(userSettings)
        .set(updates as never)
        .where(eq(userSettings.userId, DEFAULT_USER_ID)),
    { operationName: "update settings" }
  );
  return ok({ success: true });
}

// ─── Tabla de dispatch ────────────────────────────────────────────────────────

const HANDLERS: Record<string, (args: Record<string, unknown>) => Promise<ToolResult>> = {
  get_app_info: () => handleGetAppInfo(),
  list_widget_types: () => handleListWidgetTypes(),
  get_widget_type_schema: handleGetWidgetTypeSchema,
  list_widgets: handleListWidgets,
  add_widget: handleAddWidget,
  update_widget: handleUpdateWidget,
  remove_widget: handleRemoveWidget,
  list_custom_widget_types: () => handleListCustomWidgetTypes(),
  create_custom_widget_type: handleCreateCustomWidgetType,
  update_custom_widget_type: handleUpdateCustomWidgetType,
  delete_custom_widget_type: handleDeleteCustomWidgetType,
  add_custom_widget: handleAddCustomWidget,
  export_custom_widget_type: handleExportCustomWidgetType,
  import_custom_widget_type: handleImportCustomWidgetType,
  list_links: handleListLinks,
  add_link: handleAddLink,
  update_link: handleUpdateLink,
  delete_link: handleDeleteLink,
  list_categories: () => handleListCategories(),
  list_tags: () => handleListTags(),
  list_projects: () => handleListProjects(),
  get_settings: () => handleGetSettings(),
  update_settings: handleUpdateSettings,
};

/** Lista de nombres de herramientas disponibles (usado para validación) */
export const TOOL_NAMES = Object.keys(HANDLERS);

/**
 * Llama a una herramienta MCP por nombre con los argumentos dados.
 */
export async function callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
  const handler = HANDLERS[name];
  if (!handler) {
    return {
      content: [{ type: "text", text: JSON.stringify({ error: `Herramienta '${name}' no encontrada. Disponibles: ${TOOL_NAMES.join(", ")}` }) }],
      isError: true,
    };
  }
  try {
    return await handler(args);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return {
      content: [{ type: "text", text: JSON.stringify({ error: `Error ejecutando herramienta '${name}': ${msg}` }) }],
      isError: true,
    };
  }
}
