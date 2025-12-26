# Pagination Implementation Summary

## Overview

Pagination support has been successfully added to all main API endpoints in Stacklume while maintaining 100% backwards compatibility with existing clients.

## Files Modified

### 1. `src/lib/db/index.ts`
Added pagination utility types and functions:

```typescript
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationMeta;
}

export function createPaginatedResponse<T>(
  data: T[],
  page: number,
  limit: number,
  total: number
): PaginatedResponse<T>
```

### 2. `src/app/api/links/route.ts`
Updated GET handler to support pagination:
- Checks for `page` or `limit` query params
- If absent: returns all links (backwards compatible)
- If present: returns paginated response with metadata
- Uses Drizzle's `.limit()` and `.offset()` for pagination
- Fetches total count in parallel for performance

### 3. `src/app/api/categories/route.ts`
Updated GET handler with same pagination logic as links endpoint.

### 4. `src/app/api/tags/route.ts`
Updated GET handler with same pagination logic as links endpoint.

### 5. `src/lib/validations/index.ts`
Already contained the `paginationSchema` (lines 402-405):
```typescript
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
```

## API Specification

### Query Parameters

| Parameter | Type | Required | Default | Min | Max | Description |
|-----------|------|----------|---------|-----|-----|-------------|
| `page` | integer | No | 1 | 1 | - | Page number to retrieve |
| `limit` | integer | No | 20 | 1 | 100 | Number of items per page |

### Response Formats

#### With Pagination (when `page` or `limit` provided)
```json
{
  "data": [
    { "id": "...", "title": "..." },
    ...
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

#### Without Pagination (backwards compatible)
```json
[
  { "id": "...", "title": "..." },
  ...
]
```

## Backwards Compatibility

The implementation is **100% backwards compatible**:

1. **Existing clients without pagination params** continue to work unchanged:
   - `GET /api/links` returns all links as array
   - `GET /api/categories` returns all categories as array
   - `GET /api/tags` returns all tags as array

2. **New clients with pagination params** get structured responses:
   - `GET /api/links?page=1&limit=20` returns paginated response
   - `GET /api/categories?page=2&limit=10` returns paginated response
   - `GET /api/tags?page=1` returns paginated response with default limit

## Usage Examples

### REST API

```bash
# Backwards compatible - get all items
GET /api/links
GET /api/categories
GET /api/tags

# Paginated - page 1 with default limit (20)
GET /api/links?page=1
GET /api/categories?page=1
GET /api/tags?page=1

# Paginated - custom page and limit
GET /api/links?page=2&limit=50
GET /api/categories?page=3&limit=10
GET /api/tags?page=1&limit=100

# Only limit specified (page defaults to 1)
GET /api/links?limit=30
```

### TypeScript Client

```typescript
import type { PaginatedResponse } from '@/lib/db';
import type { Link, Category, Tag } from '@/lib/db/schema';

// Paginated fetch
async function fetchPaginatedLinks(page: number, limit: number = 20) {
  const res = await fetch(`/api/links?page=${page}&limit=${limit}`);
  const data: PaginatedResponse<Link> = await res.json();

  return {
    links: data.data,
    currentPage: data.pagination.page,
    totalPages: data.pagination.totalPages,
    total: data.pagination.total,
  };
}

// Backwards compatible - fetch all
async function fetchAllLinks() {
  const res = await fetch('/api/links');
  const links: Link[] = await res.json();
  return links;
}
```

### React Hook Example

```typescript
import { useState, useEffect } from 'react';
import type { PaginatedResponse } from '@/lib/db';
import type { Link } from '@/lib/db/schema';

interface UsePaginatedLinksResult {
  links: Link[];
  page: number;
  totalPages: number;
  total: number;
  isLoading: boolean;
  error: Error | null;
  nextPage: () => void;
  prevPage: () => void;
  goToPage: (page: number) => void;
}

export function usePaginatedLinks(
  initialPage: number = 1,
  limit: number = 20
): UsePaginatedLinksResult {
  const [links, setLinks] = useState<Link[]>([]);
  const [page, setPage] = useState(initialPage);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchLinks = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const res = await fetch(`/api/links?page=${page}&limit=${limit}`);
        if (!res.ok) throw new Error('Failed to fetch links');

        const data: PaginatedResponse<Link> = await res.json();
        setLinks(data.data);
        setTotalPages(data.pagination.totalPages);
        setTotal(data.pagination.total);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown error'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchLinks();
  }, [page, limit]);

  return {
    links,
    page,
    totalPages,
    total,
    isLoading,
    error,
    nextPage: () => setPage(p => Math.min(p + 1, totalPages)),
    prevPage: () => setPage(p => Math.max(p - 1, 1)),
    goToPage: (newPage: number) => setPage(Math.max(1, Math.min(newPage, totalPages))),
  };
}

// Usage in component
function LinksPage() {
  const {
    links,
    page,
    totalPages,
    total,
    isLoading,
    error,
    nextPage,
    prevPage,
  } = usePaginatedLinks(1, 20);

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      <h1>Links ({total} total)</h1>
      <div>
        {links.map(link => (
          <div key={link.id}>{link.title}</div>
        ))}
      </div>
      <div className="pagination">
        <button onClick={prevPage} disabled={page === 1}>
          Previous
        </button>
        <span>Page {page} of {totalPages}</span>
        <button onClick={nextPage} disabled={page >= totalPages}>
          Next
        </button>
      </div>
    </div>
  );
}
```

## Database Performance

The implementation is optimized for performance:

1. **Parallel Queries**: Data fetch and count run simultaneously using `Promise.all()`
2. **Efficient Pagination**: Uses native SQL `LIMIT` and `OFFSET` via Drizzle ORM
3. **Retry Logic**: All queries wrapped with existing `withRetry()` for reliability
4. **Ordered Results**: Maintains original ordering per endpoint

Query example:
```sql
-- Links pagination query
SELECT * FROM links ORDER BY created_at DESC LIMIT 20 OFFSET 0;
SELECT COUNT(*) FROM links;

-- Categories pagination query
SELECT * FROM categories ORDER BY created_at DESC LIMIT 20 OFFSET 0;
SELECT COUNT(*) FROM categories;

-- Tags pagination query
SELECT * FROM tags ORDER BY name ASC LIMIT 20 OFFSET 0;
SELECT COUNT(*) FROM tags;
```

## Validation

Query parameters are validated using Zod schema:

```typescript
const paginationParams = paginationSchema.parse({
  page: searchParams.get("page"),    // Coerced to number, min 1, default 1
  limit: searchParams.get("limit"),  // Coerced to number, min 1, max 100, default 20
});
```

Invalid parameters throw Zod validation errors with descriptive messages.

## Testing

See `test-pagination.md` for detailed testing instructions.

### Quick Tests

```bash
# Start dev server
pnpm dev

# Test backwards compatibility (in new terminal)
curl http://localhost:3000/api/links
curl http://localhost:3000/api/categories
curl http://localhost:3000/api/tags

# Test pagination
curl http://localhost:3000/api/links?page=1&limit=10
curl http://localhost:3000/api/categories?page=1&limit=5
curl http://localhost:3000/api/tags?page=1&limit=20
```

## Next Steps (Optional Enhancements)

While the current implementation is complete and production-ready, future enhancements could include:

1. **Cursor-based pagination** for very large datasets
2. **Sorting parameters** (e.g., `?sortBy=title&sortOrder=asc`)
3. **Filtering parameters** (e.g., `?categoryId=xxx` for links)
4. **Response headers** for pagination metadata (Link header, X-Total-Count)
5. **Rate limiting** per pagination endpoint
6. **Caching strategy** for frequently accessed pages

## Migration Guide

If you're currently using the Stacklume API:

### No Changes Required
If your code doesn't use pagination parameters, everything continues to work:
```typescript
// This still works exactly as before
const links = await fetch('/api/links').then(r => r.json());
// links is Link[]
```

### Opt-in to Pagination
Add pagination parameters when you want them:
```typescript
// New paginated approach
const response = await fetch('/api/links?page=1&limit=20').then(r => r.json());
// response is PaginatedResponse<Link>
const links = response.data;
const pagination = response.pagination;
```

### Type Guards
If you need to handle both formats:
```typescript
function isPaginatedResponse<T>(
  data: T[] | PaginatedResponse<T>
): data is PaginatedResponse<T> {
  return 'pagination' in data && 'data' in data;
}

const response = await fetch(url).then(r => r.json());
const links = isPaginatedResponse(response) ? response.data : response;
```
