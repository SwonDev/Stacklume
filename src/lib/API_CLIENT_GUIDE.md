# API Client Guide

This guide explains how to use the centralized API client in Stacklume.

## Overview

The API client (`@/lib/api-client`) provides a type-safe, consistent interface for all API operations in the application. It handles:

- **Type safety**: Full TypeScript support with inferred types
- **Error handling**: Automatic error catching and custom `ApiClientError` class
- **JSON handling**: Automatic parsing and serialization
- **Consistency**: Unified interface across all endpoints

## Import

```typescript
import { apiClient, ApiClientError } from "@/lib/api-client";
```

## Usage Patterns

### Basic CRUD Operations

#### Links

```typescript
// Get all links
const links = await apiClient.links.getAll();

// Get a single link
const link = await apiClient.links.getById("link-id");

// Create a link
const newLink = await apiClient.links.create({
  url: "https://example.com",
  title: "Example",
  description: "An example link",
  categoryId: "category-id",
  isFavorite: false,
});

// Update a link
const updated = await apiClient.links.update("link-id", {
  title: "Updated Title",
  isFavorite: true,
});

// Delete a link
await apiClient.links.delete("link-id");

// Import links from JSON
await apiClient.links.import(jsonData);

// Import links from HTML bookmarks
await apiClient.links.importHtml(htmlString);
```

#### Categories

```typescript
// Get all categories
const categories = await apiClient.categories.getAll();

// Create a category
const category = await apiClient.categories.create({
  name: "Development",
  description: "Dev resources",
  icon: "code",
  color: "blue",
});

// Update a category
await apiClient.categories.update("category-id", {
  name: "Updated Name",
});

// Delete a category
await apiClient.categories.delete("category-id");

// Reorder categories
await apiClient.categories.reorder(["id1", "id2", "id3"]);
```

#### Tags

```typescript
// Get all tags
const tags = await apiClient.tags.getAll();

// Create a tag
const tag = await apiClient.tags.create({
  name: "javascript",
  color: "yellow",
});

// Update a tag
await apiClient.tags.update("tag-id", {
  name: "typescript",
});

// Delete a tag
await apiClient.tags.delete("tag-id");

// Reorder tags
await apiClient.tags.reorder(["id1", "id2", "id3"]);

// Get tags for a specific link
const linkTags = await apiClient.tags.getForLink("link-id");
```

#### Link-Tag Associations

```typescript
// Get all link-tag associations
const associations = await apiClient.linkTags.getAll();

// Add a tag to a link
await apiClient.linkTags.add("link-id", "tag-id");

// Remove a tag from a link
await apiClient.linkTags.remove("link-id", "tag-id");
```

#### Widgets

```typescript
// Get all widgets
const widgets = await apiClient.widgets.getAll();

// Create a widget
const widget = await apiClient.widgets.create({
  type: "favorites",
  title: "My Favorites",
  size: "medium",
  config: { limit: 10 },
  layout: { x: 0, y: 0, w: 4, h: 3 },
});

// Update a widget
await apiClient.widgets.update("widget-id", {
  title: "Updated Title",
  size: "large",
});

// Delete a widget
await apiClient.widgets.delete("widget-id");

// Update widget layouts (bulk operation)
await apiClient.widgets.updateLayouts([
  { i: "widget-1", x: 0, y: 0, w: 4, h: 3 },
  { i: "widget-2", x: 4, y: 0, w: 4, h: 3 },
]);

// Clear all widgets
await apiClient.widgets.clearAll();
```

#### Projects

```typescript
// Get all projects
const projects = await apiClient.projects.getAll();

// Get a single project
const project = await apiClient.projects.getById("project-id");

// Create a project
const newProject = await apiClient.projects.create({
  name: "Work",
  description: "Work-related links",
  icon: "briefcase",
  color: "#3b82f6",
});

// Update a project
await apiClient.projects.update("project-id", {
  name: "Updated Name",
});

// Delete a project
await apiClient.projects.delete("project-id");

// Reorder projects
await apiClient.projects.reorder(["id1", "id2", "id3"]);
```

### Utility APIs

#### Scraping

```typescript
// Scrape metadata from a URL
const metadata = await apiClient.scrape.url("https://example.com");
// Returns: { title, description, image, favicon, siteName, author }
```

#### Settings

```typescript
// Get user settings
const settings = await apiClient.settings.get();

// Update settings
await apiClient.settings.update({
  theme: "dark",
  viewDensity: "compact",
  reduceMotion: true,
});
```

### External APIs

#### GitHub

```typescript
// Search repositories
const result = await apiClient.github.search({
  q: "react",
  language: "typescript",
  sort: "stars",
  order: "desc",
  page: 1,
  per_page: 30,
});
// Returns: { repos, totalCount, hasMore, page, perPage }

// Get trending repositories
const trending = await apiClient.github.trending(10);
// Returns array of trending repos
```

#### Steam

```typescript
// Search games by category
const games = await apiClient.steam.search({
  category: "specials", // "new_releases" | "coming_soon" | "specials" | "top_sellers" | "most_played"
  start: 0,
  count: 50,
});
// Returns: { games, totalCount, hasMore, start, count }

// Search games by term
const searchResults = await apiClient.steam.search({
  term: "indie",
  count: 20,
});
```

## Error Handling

The API client throws `ApiClientError` for all API failures:

```typescript
import { apiClient, ApiClientError } from "@/lib/api-client";

try {
  const links = await apiClient.links.getAll();
  // Handle success
} catch (error) {
  if (error instanceof ApiClientError) {
    console.error("API Error:", error.message);
    console.error("Status Code:", error.statusCode);
    console.error("Response:", error.response);

    // Handle specific error codes
    if (error.statusCode === 404) {
      // Not found
    } else if (error.statusCode === 429) {
      // Rate limit exceeded
    } else if (error.statusCode >= 500) {
      // Server error
    }
  } else {
    // Network or other errors
    console.error("Unexpected error:", error);
  }
}
```

## Type Exports

All types are exported from the API client:

```typescript
import type {
  // Database types
  Link,
  NewLink,
  Category,
  NewCategory,
  Tag,
  NewTag,
  Project,
  NewProject,
  Widget,
  NewWidget,

  // API-specific types
  LinkTag,
  LayoutUpdate,
  GithubRepo,
  GithubSearchResponse,
  TrendingRepo,
  SteamGame,
  SteamSearchResponse,

  // Error handling
  ApiError,
  ApiClientError,
} from "@/lib/api-client";
```

## Advanced Usage

### Custom HTTP Requests

For endpoints not covered by the API client, use the `http` export:

```typescript
import { http } from "@/lib/api-client";

// Make a custom GET request
const data = await http.get<MyType>("/api/custom-endpoint");

// Make a custom POST request
const result = await http.post<MyResponseType>("/api/custom", {
  foo: "bar",
});
```

### Zustand Store Integration

The API client is designed to work seamlessly with Zustand stores:

```typescript
import { create } from "zustand";
import { apiClient, type Link } from "@/lib/api-client";

interface LinksState {
  links: Link[];
  isLoading: boolean;

  fetchLinks: () => Promise<void>;
  createLink: (data: Partial<NewLink>) => Promise<void>;
}

export const useLinksStore = create<LinksState>((set, get) => ({
  links: [],
  isLoading: false,

  fetchLinks: async () => {
    set({ isLoading: true });
    try {
      const links = await apiClient.links.getAll();
      set({ links, isLoading: false });
    } catch (error) {
      console.error("Failed to fetch links:", error);
      set({ isLoading: false });
    }
  },

  createLink: async (data) => {
    try {
      const newLink = await apiClient.links.create(data);
      set((state) => ({ links: [newLink, ...state.links] }));
    } catch (error) {
      console.error("Failed to create link:", error);
      throw error;
    }
  },
}));
```

### Optimistic Updates

Example of optimistic updates with automatic rollback on error:

```typescript
const updateCategory = async (id: string, updates: Partial<NewCategory>) => {
  // Store original state
  const originalCategories = get().categories;

  // Optimistic update
  set((state) => ({
    categories: state.categories.map((cat) =>
      cat.id === id ? { ...cat, ...updates } : cat
    ),
  }));

  try {
    // Perform API call
    const updated = await apiClient.categories.update(id, updates);

    // Update with server response
    set((state) => ({
      categories: state.categories.map((cat) =>
        cat.id === id ? updated : cat
      ),
    }));
  } catch (error) {
    // Rollback on error
    set({ categories: originalCategories });
    throw error;
  }
};
```

## Best Practices

1. **Always handle errors**: Use try-catch blocks and handle `ApiClientError`
2. **Use TypeScript types**: Import and use the exported types for better type safety
3. **Optimistic updates**: For better UX, update the UI immediately and rollback on errors
4. **Loading states**: Set loading states before API calls and clear them after
5. **Avoid duplicate calls**: Check if data is already being fetched before making new requests
6. **Rate limiting**: Be mindful of rate limits on external APIs (GitHub, Steam)

## Migration from Fetch

If you have existing fetch calls, here's how to migrate:

### Before
```typescript
const response = await fetch("/api/links");
if (!response.ok) {
  throw new Error("Failed to fetch links");
}
const links = await response.json();
```

### After
```typescript
const links = await apiClient.links.getAll();
```

### Before (POST)
```typescript
const response = await fetch("/api/categories", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ name: "New Category" }),
});
if (!response.ok) {
  throw new Error("Failed to create category");
}
const category = await response.json();
```

### After (POST)
```typescript
const category = await apiClient.categories.create({
  name: "New Category",
});
```

## File Location

The API client is located at:
```
C:\Users\swon_\OneDrive\Documentos\PROYECTOS\VIBECLAUDE\Stacklume\src\lib\api-client.ts
```

## Future Enhancements

Potential improvements for the API client:

- Request/response interceptors
- Automatic retry logic with exponential backoff
- Request deduplication
- Request caching with TTL
- AbortController support for cancellable requests
- Progress tracking for file uploads
- WebSocket support for real-time updates
