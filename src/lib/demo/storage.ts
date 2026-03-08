/**
 * Demo Mode — Capa de almacenamiento en localStorage
 *
 * Implementa las mismas operaciones CRUD que las API routes del servidor,
 * pero almacenando los datos localmente en el navegador.
 * Cada usuario tiene sus datos completamente privados en su dispositivo.
 */


// ─── Claves localStorage ────────────────────────────────────────────────────

const KEYS = {
  links: "stacklume-demo-links",
  categories: "stacklume-demo-categories",
  tags: "stacklume-demo-tags",
  linkTags: "stacklume-demo-link-tags",
  widgets: "stacklume-demo-widgets",
  settings: "stacklume-demo-settings",
  projects: "stacklume-demo-projects",
  layouts: "stacklume-demo-layouts",
} as const;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function readKey<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeKey<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // localStorage lleno o no disponible — ignorar silenciosamente
  }
}

function now(): string {
  return new Date().toISOString();
}

function id(): string {
  return crypto.randomUUID();
}

// ─── Tipos mínimos ────────────────────────────────────────────────────────────

interface DemoLink {
  id: string;
  url: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  faviconUrl: string | null;
  categoryId: string | null;
  isFavorite: boolean;
  isRead: boolean;
  notes: string | null;
  reminderAt: string | null;
  siteName: string | null;
  author: string | null;
  source: string;
  platform: string | null;
  contentType: string | null;
  platformColor: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

interface DemoCategory {
  id: string;
  name: string;
  description: string | null;
  icon: string;
  color: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

interface DemoTag {
  id: string;
  name: string;
  color: string | null;
  createdAt: string;
  deletedAt: string | null;
}

interface DemoLinkTag {
  linkId: string;
  tagId: string;
}

interface DemoWidget {
  id: string;
  type: string;
  title: string | null;
  size: string;
  projectId: string | null;
  categoryId: string | null;
  tagId: string | null;
  tags: string[] | null;
  config: Record<string, unknown> | null;
  layout: { x: number; y: number; w: number; h: number };
  layoutX: number;
  layoutY: number;
  layoutW: number;
  layoutH: number;
  kanbanColumnId: string | null;
  kanbanOrder: number | null;
  kanbanHeight: number | null;
  backgroundColor: string | null;
  backgroundGradient: string | null;
  accentColor: string | null;
  opacity: number | null;
  isLocked: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

interface DemoProject {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  icon: string;
  color: string;
  order: number;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

interface DemoSettings {
  id: string;
  userId: string;
  theme: string;
  viewDensity: string;
  viewMode: string;
  showTooltips: boolean;
  reduceMotion: boolean;
  mcpEnabled: boolean;
  mcpApiKey: string | null;
  language: string;
  gridColumns: number;
  sidebarAlwaysVisible: boolean;
  defaultSortField: string;
  defaultSortOrder: string;
  thumbnailSize: string;
  sidebarDensity: string;
  autoBackupInterval: number;
  confirmBeforeDelete: boolean;
  linkClickBehavior: string;
  onboardingCompleted: boolean;
  createdAt: string;
  updatedAt: string;
}

// ─── Settings ─────────────────────────────────────────────────────────────────

const DEFAULT_SETTINGS: DemoSettings = {
  id: "demo-settings",
  userId: "demo",
  theme: "dark",
  viewDensity: "normal",
  viewMode: "bento",
  showTooltips: true,
  reduceMotion: false,
  mcpEnabled: false,
  mcpApiKey: null,
  language: "es",
  gridColumns: 12,
  sidebarAlwaysVisible: false,
  defaultSortField: "createdAt",
  defaultSortOrder: "desc",
  thumbnailSize: "medium",
  sidebarDensity: "normal",
  autoBackupInterval: 0,
  confirmBeforeDelete: false,
  linkClickBehavior: "new-tab",
  onboardingCompleted: false,
  createdAt: now(),
  updatedAt: now(),
};

export const demoSettings = {
  get(): DemoSettings {
    return readKey(KEYS.settings, DEFAULT_SETTINGS);
  },
  update(patch: Partial<DemoSettings>): DemoSettings {
    const current = this.get();
    const updated = { ...current, ...patch, updatedAt: now() };
    writeKey(KEYS.settings, updated);
    return updated;
  },
};

// ─── Links ────────────────────────────────────────────────────────────────────

export const demoLinks = {
  list(filters?: {
    categoryId?: string;
    isFavorite?: boolean;
    search?: string;
    platform?: string;
    sortBy?: string;
    sortOrder?: string;
  }): DemoLink[] {
    let links = readKey<DemoLink[]>(KEYS.links, []).filter(
      (l) => l.deletedAt === null
    );

    if (filters?.categoryId)
      links = links.filter((l) => l.categoryId === filters.categoryId);
    if (filters?.isFavorite !== undefined)
      links = links.filter((l) => l.isFavorite === filters.isFavorite);
    if (filters?.platform)
      links = links.filter((l) => l.platform === filters.platform);
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      links = links.filter(
        (l) =>
          l.title.toLowerCase().includes(q) ||
          l.url.toLowerCase().includes(q) ||
          (l.description && l.description.toLowerCase().includes(q))
      );
    }

    const sortBy = filters?.sortBy ?? "createdAt";
    const sortOrder = filters?.sortOrder ?? "desc";
    links.sort((a, b) => {
      const av = String((a as unknown as Record<string, unknown>)[sortBy] ?? "");
      const bv = String((b as unknown as Record<string, unknown>)[sortBy] ?? "");
      return sortOrder === "asc"
        ? av.localeCompare(bv)
        : bv.localeCompare(av);
    });

    return links;
  },

  get(id: string): DemoLink | null {
    return (
      readKey<DemoLink[]>(KEYS.links, []).find(
        (l) => l.id === id && l.deletedAt === null
      ) ?? null
    );
  },

  create(data: Partial<DemoLink>): DemoLink {
    const link: DemoLink = {
      id: id(),
      url: data.url ?? "",
      title: data.title ?? "",
      description: data.description ?? null,
      imageUrl: data.imageUrl ?? null,
      faviconUrl: data.faviconUrl ?? null,
      categoryId: data.categoryId ?? null,
      isFavorite: data.isFavorite ?? false,
      isRead: data.isRead ?? false,
      notes: data.notes ?? null,
      reminderAt: data.reminderAt ?? null,
      siteName: data.siteName ?? null,
      author: data.author ?? null,
      source: data.source ?? "manual",
      platform: data.platform ?? null,
      contentType: data.contentType ?? null,
      platformColor: data.platformColor ?? null,
      createdAt: now(),
      updatedAt: now(),
      deletedAt: null,
    };
    const links = readKey<DemoLink[]>(KEYS.links, []);
    links.push(link);
    writeKey(KEYS.links, links);
    return link;
  },

  update(linkId: string, patch: Partial<DemoLink>): DemoLink | null {
    const links = readKey<DemoLink[]>(KEYS.links, []);
    const idx = links.findIndex((l) => l.id === linkId);
    if (idx === -1) return null;
    links[idx] = { ...links[idx], ...patch, updatedAt: now() };
    writeKey(KEYS.links, links);
    return links[idx];
  },

  delete(linkId: string): boolean {
    const links = readKey<DemoLink[]>(KEYS.links, []);
    const idx = links.findIndex((l) => l.id === linkId);
    if (idx === -1) return false;
    links[idx].deletedAt = now();
    writeKey(KEYS.links, links);
    // Limpiar link-tags asociados
    const lt = readKey<DemoLinkTag[]>(KEYS.linkTags, []).filter(
      (lt) => lt.linkId !== linkId
    );
    writeKey(KEYS.linkTags, lt);
    return true;
  },
};

// ─── Categories ───────────────────────────────────────────────────────────────

export const demoCategories = {
  list(): DemoCategory[] {
    return readKey<DemoCategory[]>(KEYS.categories, []).filter(
      (c) => c.deletedAt === null
    );
  },

  create(data: Partial<DemoCategory>): DemoCategory {
    const cat: DemoCategory = {
      id: id(),
      name: data.name ?? "Nueva categoría",
      description: data.description ?? null,
      icon: data.icon ?? "folder",
      color: data.color ?? "gold",
      createdAt: now(),
      updatedAt: now(),
      deletedAt: null,
    };
    const cats = readKey<DemoCategory[]>(KEYS.categories, []);
    cats.push(cat);
    writeKey(KEYS.categories, cats);
    return cat;
  },

  update(catId: string, patch: Partial<DemoCategory>): DemoCategory | null {
    const cats = readKey<DemoCategory[]>(KEYS.categories, []);
    const idx = cats.findIndex((c) => c.id === catId);
    if (idx === -1) return null;
    cats[idx] = { ...cats[idx], ...patch, updatedAt: now() };
    writeKey(KEYS.categories, cats);
    return cats[idx];
  },

  delete(catId: string): boolean {
    const cats = readKey<DemoCategory[]>(KEYS.categories, []);
    const idx = cats.findIndex((c) => c.id === catId);
    if (idx === -1) return false;
    cats[idx].deletedAt = now();
    writeKey(KEYS.categories, cats);
    return true;
  },
};

// ─── Tags ─────────────────────────────────────────────────────────────────────

export const demoTags = {
  list(): DemoTag[] {
    return readKey<DemoTag[]>(KEYS.tags, [])
      .filter((t) => t.deletedAt === null)
      .sort((a, b) => a.name.localeCompare(b.name));
  },

  create(data: Partial<DemoTag>): DemoTag {
    const tag: DemoTag = {
      id: id(),
      name: data.name ?? "etiqueta",
      color: data.color ?? null,
      createdAt: now(),
      deletedAt: null,
    };
    const tags = readKey<DemoTag[]>(KEYS.tags, []);
    tags.push(tag);
    writeKey(KEYS.tags, tags);
    return tag;
  },

  update(tagId: string, patch: Partial<DemoTag>): DemoTag | null {
    const tags = readKey<DemoTag[]>(KEYS.tags, []);
    const idx = tags.findIndex((t) => t.id === tagId);
    if (idx === -1) return null;
    tags[idx] = { ...tags[idx], ...patch };
    writeKey(KEYS.tags, tags);
    return tags[idx];
  },

  delete(tagId: string): boolean {
    const tags = readKey<DemoTag[]>(KEYS.tags, []);
    const idx = tags.findIndex((t) => t.id === tagId);
    if (idx === -1) return false;
    tags[idx].deletedAt = now();
    writeKey(KEYS.tags, tags);
    const lt = readKey<DemoLinkTag[]>(KEYS.linkTags, []).filter(
      (lt) => lt.tagId !== tagId
    );
    writeKey(KEYS.linkTags, lt);
    return true;
  },
};

// ─── LinkTags ─────────────────────────────────────────────────────────────────

export const demoLinkTags = {
  list(): DemoLinkTag[] {
    return readKey<DemoLinkTag[]>(KEYS.linkTags, []);
  },

  forLink(linkId: string): DemoLinkTag[] {
    return readKey<DemoLinkTag[]>(KEYS.linkTags, []).filter(
      (lt) => lt.linkId === linkId
    );
  },

  add(linkId: string, tagId: string): boolean {
    const lt = readKey<DemoLinkTag[]>(KEYS.linkTags, []);
    const exists = lt.some((l) => l.linkId === linkId && l.tagId === tagId);
    if (exists) return false;
    lt.push({ linkId, tagId });
    writeKey(KEYS.linkTags, lt);
    return true;
  },

  remove(linkId: string, tagId: string): boolean {
    const lt = readKey<DemoLinkTag[]>(KEYS.linkTags, []).filter(
      (l) => !(l.linkId === linkId && l.tagId === tagId)
    );
    writeKey(KEYS.linkTags, lt);
    return true;
  },

  setForLink(linkId: string, tagIds: string[]): void {
    const lt = readKey<DemoLinkTag[]>(KEYS.linkTags, []).filter(
      (l) => l.linkId !== linkId
    );
    tagIds.forEach((tagId) => lt.push({ linkId, tagId }));
    writeKey(KEYS.linkTags, lt);
  },
};

// ─── Widgets ──────────────────────────────────────────────────────────────────

export const demoWidgets = {
  list(projectId?: string | null): DemoWidget[] {
    let widgets = readKey<DemoWidget[]>(KEYS.widgets, []).filter(
      (w) => w.deletedAt === null
    );
    if (projectId !== undefined) {
      widgets = widgets.filter(
        (w) => (w.projectId ?? null) === (projectId ?? null)
      );
    }
    return widgets;
  },

  create(data: Partial<DemoWidget>): DemoWidget {
    const lx = data.layoutX ?? data.layout?.x ?? 0;
    const ly = data.layoutY ?? data.layout?.y ?? 0;
    const lw = data.layoutW ?? data.layout?.w ?? 2;
    const lh = data.layoutH ?? data.layout?.h ?? 2;
    const widget: DemoWidget = {
      id: id(),
      type: data.type ?? "notes",
      title: data.title ?? null,
      size: data.size ?? "medium",
      projectId: data.projectId ?? null,
      categoryId: data.categoryId ?? null,
      tagId: data.tagId ?? null,
      tags: data.tags ?? null,
      config: data.config ?? null,
      layout: { x: lx, y: ly, w: lw, h: lh },
      layoutX: lx,
      layoutY: ly,
      layoutW: lw,
      layoutH: lh,
      kanbanColumnId: data.kanbanColumnId ?? null,
      kanbanOrder: data.kanbanOrder ?? null,
      kanbanHeight: data.kanbanHeight ?? null,
      backgroundColor: data.backgroundColor ?? null,
      backgroundGradient: data.backgroundGradient ?? null,
      accentColor: data.accentColor ?? null,
      opacity: data.opacity ?? null,
      isLocked: data.isLocked ?? false,
      createdAt: now(),
      updatedAt: now(),
      deletedAt: null,
    };
    const widgets = readKey<DemoWidget[]>(KEYS.widgets, []);
    widgets.push(widget);
    writeKey(KEYS.widgets, widgets);
    return widget;
  },

  update(widgetId: string, patch: Partial<DemoWidget>): DemoWidget | null {
    const widgets = readKey<DemoWidget[]>(KEYS.widgets, []);
    const idx = widgets.findIndex((w) => w.id === widgetId);
    if (idx === -1) return null;
    const updated = { ...widgets[idx], ...patch, updatedAt: now() };
    // Mantener sincronizados layout y layoutX/Y/W/H
    if (patch.layout) {
      updated.layoutX = patch.layout.x;
      updated.layoutY = patch.layout.y;
      updated.layoutW = patch.layout.w;
      updated.layoutH = patch.layout.h;
    }
    if (patch.layoutX !== undefined || patch.layoutY !== undefined ||
        patch.layoutW !== undefined || patch.layoutH !== undefined) {
      updated.layout = {
        x: updated.layoutX,
        y: updated.layoutY,
        w: updated.layoutW,
        h: updated.layoutH,
      };
    }
    widgets[idx] = updated;
    writeKey(KEYS.widgets, widgets);
    return updated;
  },

  delete(widgetId: string): boolean {
    const widgets = readKey<DemoWidget[]>(KEYS.widgets, []);
    const idx = widgets.findIndex((w) => w.id === widgetId);
    if (idx === -1) return false;
    widgets[idx].deletedAt = now();
    writeKey(KEYS.widgets, widgets);
    return true;
  },

  updateLayouts(layouts: Array<{ id: string; x: number; y: number; w: number; h: number }>): void {
    const widgets = readKey<DemoWidget[]>(KEYS.widgets, []);
    layouts.forEach(({ id: wId, x, y, w, h }) => {
      const idx = widgets.findIndex((ww) => ww.id === wId);
      if (idx !== -1) {
        widgets[idx].layoutX = x;
        widgets[idx].layoutY = y;
        widgets[idx].layoutW = w;
        widgets[idx].layoutH = h;
        widgets[idx].layout = { x, y, w, h };
        widgets[idx].updatedAt = now();
      }
    });
    writeKey(KEYS.widgets, widgets);
  },
};

// ─── Projects ─────────────────────────────────────────────────────────────────

export const demoProjects = {
  list(): DemoProject[] {
    return readKey<DemoProject[]>(KEYS.projects, [])
      .filter((p) => p.deletedAt === null)
      .sort((a, b) => a.order - b.order);
  },

  create(data: Partial<DemoProject>): DemoProject {
    const existing = this.list();
    const project: DemoProject = {
      id: id(),
      userId: "demo",
      name: data.name ?? "Proyecto",
      description: data.description ?? null,
      icon: data.icon ?? "folder",
      color: data.color ?? "gold",
      order: data.order ?? existing.length,
      isDefault: data.isDefault ?? false,
      createdAt: now(),
      updatedAt: now(),
      deletedAt: null,
    };
    const projects = readKey<DemoProject[]>(KEYS.projects, []);
    projects.push(project);
    writeKey(KEYS.projects, projects);
    return project;
  },

  update(projectId: string, patch: Partial<DemoProject>): DemoProject | null {
    const projects = readKey<DemoProject[]>(KEYS.projects, []);
    const idx = projects.findIndex((p) => p.id === projectId);
    if (idx === -1) return null;
    projects[idx] = { ...projects[idx], ...patch, updatedAt: now() };
    writeKey(KEYS.projects, projects);
    return projects[idx];
  },

  delete(projectId: string): boolean {
    const projects = readKey<DemoProject[]>(KEYS.projects, []);
    const idx = projects.findIndex((p) => p.id === projectId);
    if (idx === -1) return false;
    projects[idx].deletedAt = now();
    writeKey(KEYS.projects, projects);
    return true;
  },
};
