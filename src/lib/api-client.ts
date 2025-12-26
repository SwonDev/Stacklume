/**
 * Centralized API Client for Stacklume
 *
 * Provides type-safe methods for all API interactions with consistent
 * error handling, request/response formatting, and automatic JSON parsing.
 * Automatically includes CSRF tokens for mutating requests (POST, PUT, PATCH, DELETE).
 *
 * Usage:
 * ```ts
 * import { apiClient } from "@/lib/api-client";
 *
 * // Links
 * const links = await apiClient.links.getAll();
 * const link = await apiClient.links.create({ url: "...", title: "..." });
 *
 * // Categories
 * const categories = await apiClient.categories.getAll();
 *
 * // Widgets
 * const widgets = await apiClient.widgets.getAll();
 * ```
 */

import { getCsrfHeaders } from "@/hooks/useCsrf";
import type {
  Link,
  NewLink,
  Category,
  NewCategory,
  Tag,
  NewTag,
  Project,
  NewProject,
  Widget as DbWidget,
} from "@/lib/db/schema";

// Re-export schema types for convenience
export type { Link, NewLink, Category, NewCategory, Tag, NewTag, Project, NewProject };

// ============================================================================
// Types
// ============================================================================

/**
 * Standard API error response structure
 */
export interface ApiError {
  error: string;
  statusCode: number;
}

/**
 * API response wrapper that can be either success data or error
 */
export type ApiResponse<T> = T | ApiError;

/**
 * Check if response is an error
 */
export function isApiError(response: unknown): response is ApiError {
  return (
    typeof response === "object" &&
    response !== null &&
    "error" in response &&
    "statusCode" in response
  );
}

/**
 * Frontend Widget type (with nested layout object)
 * The database stores layout as flat fields (layoutX, layoutY, layoutW, layoutH)
 * but the frontend uses a nested layout object
 */
export interface Widget {
  id: string;
  type: string;
  title: string | null;
  size: string;
  categoryId: string | null;
  tagId: string | null;
  tags: string[] | null;
  config: Record<string, unknown> | null;
  projectId?: string | null;
  layout: {
    x: number;
    y: number;
    w: number;
    h: number;
  };
}

/**
 * New widget data for creation (without id)
 */
export type NewWidget = Omit<Widget, "id">;

/**
 * Reorder request body
 */
export interface ReorderRequest {
  orderedIds: string[];
}

/**
 * Layout update request
 */
export interface LayoutUpdate {
  i: string; // Widget ID
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface LayoutsUpdateRequest {
  layouts: LayoutUpdate[];
}

/**
 * Link-Tag association
 */
export interface LinkTag {
  linkId: string;
  tagId: string;
}

/**
 * Tag with link associations response
 */
export interface TagWithLinks extends Tag {
  linkIds?: string[];
}

// ============================================================================
// Base HTTP Client
// ============================================================================

/**
 * Custom error class for API errors
 */
export class ApiClientError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public response?: unknown
  ) {
    super(message);
    this.name = "ApiClientError";
  }
}

/**
 * Base HTTP request configuration
 */
interface RequestConfig {
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  headers?: HeadersInit;
  body?: unknown;
}

/**
 * HTTP methods that require CSRF protection
 */
const CSRF_PROTECTED_METHODS = ["POST", "PUT", "PATCH", "DELETE"];

/**
 * Make a typed HTTP request
 * Automatically handles JSON parsing and error responses
 * Automatically includes CSRF token for mutating requests
 */
async function request<T>(url: string, config: RequestConfig): Promise<T> {
  // Get CSRF headers for protected methods
  const csrfHeaders =
    CSRF_PROTECTED_METHODS.includes(config.method) ? getCsrfHeaders() : {};

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...csrfHeaders,
    ...config.headers,
  };

  const options: RequestInit = {
    method: config.method,
    headers,
  };

  if (config.body !== undefined) {
    options.body = JSON.stringify(config.body);
  }

  try {
    const response = await fetch(url, options);

    // Parse JSON response
    let data: unknown;
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    // Handle non-2xx responses
    if (!response.ok) {
      const errorMessage =
        typeof data === "object" && data !== null && "error" in data
          ? String(data.error)
          : `HTTP ${response.status}: ${response.statusText}`;

      throw new ApiClientError(errorMessage, response.status, data);
    }

    return data as T;
  } catch (error) {
    // Re-throw ApiClientError as-is
    if (error instanceof ApiClientError) {
      throw error;
    }

    // Wrap other errors (network failures, etc.)
    throw new ApiClientError(
      error instanceof Error ? error.message : "Unknown error occurred",
      0,
      error
    );
  }
}

/**
 * Convenience methods for common HTTP verbs
 */
const http = {
  get: <T>(url: string) => request<T>(url, { method: "GET" }),

  post: <T>(url: string, body?: unknown) =>
    request<T>(url, { method: "POST", body }),

  put: <T>(url: string, body?: unknown) =>
    request<T>(url, { method: "PUT", body }),

  patch: <T>(url: string, body?: unknown) =>
    request<T>(url, { method: "PATCH", body }),

  delete: <T>(url: string) => request<T>(url, { method: "DELETE" }),
};

// ============================================================================
// Links API
// ============================================================================

const linksApi = {
  /**
   * Get all links
   */
  getAll: () => http.get<Link[]>("/api/links"),

  /**
   * Get a single link by ID
   */
  getById: (id: string) => http.get<Link>(`/api/links/${id}`),

  /**
   * Create a new link
   */
  create: (data: Partial<NewLink>) => http.post<Link>("/api/links", data),

  /**
   * Update a link
   */
  update: (id: string, data: Partial<NewLink>) =>
    http.patch<Link>(`/api/links/${id}`, data),

  /**
   * Delete a link
   */
  delete: (id: string) =>
    http.delete<{ success: boolean; deleted: Link }>(`/api/links/${id}`),

  /**
   * Import links from JSON
   */
  import: (data: unknown) => http.post<{ imported: number }>("/api/links/import", data),

  /**
   * Import links from HTML bookmarks file
   */
  importHtml: (html: string) =>
    http.post<{ imported: number }>("/api/links/import-html", { html }),
};

// ============================================================================
// Categories API
// ============================================================================

const categoriesApi = {
  /**
   * Get all categories
   */
  getAll: () => http.get<Category[]>("/api/categories"),

  /**
   * Create a new category
   */
  create: (data: Partial<NewCategory>) =>
    http.post<Category>("/api/categories", data),

  /**
   * Update a category
   */
  update: (id: string, data: Partial<NewCategory>) =>
    http.patch<Category>("/api/categories", { id, ...data }),

  /**
   * Delete a category
   */
  delete: (id: string) =>
    http.delete<{ success: boolean; deleted: Category }>(
      `/api/categories?id=${id}`
    ),

  /**
   * Reorder categories
   */
  reorder: (orderedIds: string[]) =>
    http.put<Category[]>("/api/categories/reorder", { orderedIds }),
};

// ============================================================================
// Tags API
// ============================================================================

const tagsApi = {
  /**
   * Get all tags
   */
  getAll: () => http.get<Tag[]>("/api/tags"),

  /**
   * Create a new tag
   */
  create: (data: Partial<NewTag>) => http.post<Tag>("/api/tags", data),

  /**
   * Update a tag
   */
  update: (id: string, data: Partial<NewTag>) =>
    http.patch<Tag>("/api/tags", { id, ...data }),

  /**
   * Delete a tag
   */
  delete: (id: string) =>
    http.delete<{ success: boolean; deleted: Tag }>(`/api/tags?id=${id}`),

  /**
   * Reorder tags
   */
  reorder: (orderedIds: string[]) =>
    http.put<Tag[]>("/api/tags/reorder", { orderedIds }),

  /**
   * Get tags for a specific link
   */
  getForLink: (linkId: string) =>
    http.get<Tag[]>(`/api/tags/link?linkId=${linkId}`),
};

// ============================================================================
// Link-Tags API
// ============================================================================

const linkTagsApi = {
  /**
   * Get all link-tag associations
   */
  getAll: () => http.get<LinkTag[]>("/api/link-tags"),

  /**
   * Add a tag to a link
   */
  add: (linkId: string, tagId: string) =>
    http.post<LinkTag>("/api/link-tags", { linkId, tagId }),

  /**
   * Remove a tag from a link
   */
  remove: (linkId: string, tagId: string) =>
    http.delete<{ success: boolean }>(
      `/api/link-tags?linkId=${linkId}&tagId=${tagId}`
    ),
};

// ============================================================================
// Widgets API
// ============================================================================

const widgetsApi = {
  /**
   * Get all widgets
   */
  getAll: () => http.get<Widget[]>("/api/widgets"),

  /**
   * Create a new widget
   */
  create: (data: NewWidget) => http.post<Widget>("/api/widgets", data),

  /**
   * Update a widget
   */
  update: (id: string, data: Partial<NewWidget>) =>
    http.patch<Widget>("/api/widgets", { id, ...data }),

  /**
   * Delete a widget
   */
  delete: (id: string) =>
    http.delete<{ success: boolean; deleted: DbWidget }>(
      `/api/widgets?id=${id}`
    ),

  /**
   * Update widget layouts (bulk operation)
   */
  updateLayouts: (layouts: LayoutUpdate[]) =>
    http.patch<{ success: boolean }>("/api/widgets/layouts", { layouts }),

  /**
   * Clear all widgets
   */
  clearAll: () => http.delete<{ success: boolean }>("/api/widgets/clear"),
};

// ============================================================================
// Projects API
// ============================================================================

const projectsApi = {
  /**
   * Get all projects
   */
  getAll: () => http.get<Project[]>("/api/projects"),

  /**
   * Get a single project by ID
   */
  getById: (id: string) => http.get<Project>(`/api/projects/${id}`),

  /**
   * Create a new project
   */
  create: (data: Partial<NewProject>) =>
    http.post<Project>("/api/projects", data),

  /**
   * Update a project
   */
  update: (id: string, data: Partial<NewProject>) =>
    http.put<Project>(`/api/projects/${id}`, data),

  /**
   * Delete a project
   */
  delete: (id: string) =>
    http.delete<{ success: boolean; deleted: Project }>(
      `/api/projects/${id}`
    ),

  /**
   * Reorder projects
   */
  reorder: (orderedIds: string[]) =>
    http.put<Project[]>("/api/projects/reorder", { orderedIds }),
};

// ============================================================================
// Scraping API
// ============================================================================

const scrapeApi = {
  /**
   * Scrape metadata from a URL
   */
  url: (url: string) =>
    http.post<{
      title?: string;
      description?: string;
      image?: string;
      favicon?: string;
      siteName?: string;
      author?: string;
    }>("/api/scrape", { url }),
};

// ============================================================================
// Settings API
// ============================================================================

const settingsApi = {
  /**
   * Get user settings
   */
  get: () =>
    http.get<{
      theme: string;
      viewDensity: string;
      viewMode: string;
      showTooltips: boolean;
      reduceMotion: boolean;
    }>("/api/settings"),

  /**
   * Update user settings
   */
  update: (data: {
    theme?: string;
    viewDensity?: string;
    viewMode?: string;
    showTooltips?: boolean;
    reduceMotion?: boolean;
  }) => http.patch("/api/settings", data),
};

// ============================================================================
// GitHub API (External)
// ============================================================================

/**
 * GitHub repository interface
 */
export interface GithubRepo {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  stargazers_count: number;
  forks_count: number;
  language: string | null;
  topics: string[];
  owner: {
    login: string;
    avatar_url: string;
  };
  created_at: string;
  updated_at: string;
  open_issues_count: number;
  license: {
    name: string;
  } | null;
}

/**
 * GitHub search response
 */
export interface GithubSearchResponse {
  repos: GithubRepo[];
  totalCount: number;
  hasMore: boolean;
  page: number;
  perPage: number;
}

/**
 * GitHub trending repository
 */
export interface TrendingRepo {
  title: string;
  description: string;
  link: string;
  pubDate: string;
  repoUrl: string;
  repoName: string;
  imageUrl?: string;
}

const githubApi = {
  /**
   * Search GitHub repositories
   */
  search: (params: {
    q: string;
    page?: number;
    per_page?: number;
    sort?: "stars" | "forks" | "updated" | "help-wanted-issues" | "";
    order?: "desc" | "asc";
    language?: string;
  }) => {
    const searchParams = new URLSearchParams();
    searchParams.set("q", params.q);
    if (params.page) searchParams.set("page", params.page.toString());
    if (params.per_page) searchParams.set("per_page", params.per_page.toString());
    if (params.sort) searchParams.set("sort", params.sort);
    if (params.order) searchParams.set("order", params.order);
    if (params.language) searchParams.set("language", params.language);

    return http.get<GithubSearchResponse>(`/api/github-repos?${searchParams.toString()}`);
  },

  /**
   * Get trending repositories
   */
  trending: (maxItems = 10) =>
    http.get<TrendingRepo[]>(`/api/github-trending?maxItems=${maxItems}`),
};

// ============================================================================
// Steam API (External)
// ============================================================================

/**
 * Steam game interface
 */
export interface SteamGame {
  id: number;
  name: string;
  discounted: boolean;
  discountPercent: number;
  originalPrice: string | null;
  finalPrice: string;
  imageUrl: string;
  platforms: {
    windows: boolean;
    mac: boolean;
    linux: boolean;
  };
  storeUrl: string;
  releaseDate: string;
}

/**
 * Steam search response
 */
export interface SteamSearchResponse {
  games: SteamGame[];
  totalCount: number;
  hasMore: boolean;
  start: number;
  count: number;
}

const steamApi = {
  /**
   * Search Steam games
   */
  search: (params: {
    category?: "new_releases" | "coming_soon" | "specials" | "top_sellers" | "most_played";
    start?: number;
    count?: number;
    term?: string;
  }) => {
    const searchParams = new URLSearchParams();
    if (params.category) searchParams.set("category", params.category);
    if (params.start !== undefined) searchParams.set("start", params.start.toString());
    if (params.count !== undefined) searchParams.set("count", params.count.toString());
    if (params.term) searchParams.set("term", params.term);

    return http.get<SteamSearchResponse>(`/api/steam-games?${searchParams.toString()}`);
  },
};

// ============================================================================
// Main API Client Export
// ============================================================================

/**
 * Centralized API client with namespaced endpoints
 *
 * @example
 * ```ts
 * // Get all links
 * const links = await apiClient.links.getAll();
 *
 * // Create a category
 * const category = await apiClient.categories.create({
 *   name: "Development",
 *   icon: "code"
 * });
 *
 * // Update a widget
 * await apiClient.widgets.update(widgetId, {
 *   title: "New Title"
 * });
 *
 * // Search GitHub
 * const repos = await apiClient.github.search({ q: "react", language: "typescript" });
 *
 * // Get Steam games on sale
 * const games = await apiClient.steam.search({ category: "specials", count: 20 });
 * ```
 */
export const apiClient = {
  links: linksApi,
  categories: categoriesApi,
  tags: tagsApi,
  linkTags: linkTagsApi,
  widgets: widgetsApi,
  projects: projectsApi,
  scrape: scrapeApi,
  settings: settingsApi,
  github: githubApi,
  steam: steamApi,
};

// ============================================================================
// Utility exports
// ============================================================================

/**
 * Re-export http methods for custom endpoints
 */
export { http };
