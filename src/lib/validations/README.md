# API Validation Schemas

This directory contains Zod validation schemas for all API endpoints in Stacklume.

## Installation

Zod is already installed as a dependency:

```json
"zod": "^4.1.13"
```

## Usage

### Basic Usage in API Routes

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { validateRequest, createLinkSchema } from '@/lib/validations';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate request body
    const validation = validateRequest(createLinkSchema, body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.errors },
        { status: 400 }
      );
    }

    // Use validated data (TypeScript knows the exact shape)
    const { data } = validation;

    // Insert into database
    const [created] = await db.insert(links).values(data).returning();

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error('Error creating link:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### Validating URL Parameters

```typescript
import { validateRequest, linkIdSchema } from '@/lib/validations';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // Validate path parameter
  const validation = validateRequest(linkIdSchema, params);

  if (!validation.success) {
    return NextResponse.json(
      { error: 'Invalid link ID', details: validation.errors },
      { status: 400 }
    );
  }

  const { id } = validation.data;

  // Fetch link from database
  const link = await db.query.links.findFirst({
    where: eq(links.id, id),
  });

  if (!link) {
    return NextResponse.json({ error: 'Link not found' }, { status: 404 });
  }

  return NextResponse.json(link);
}
```

### Validating Query Parameters

```typescript
import { validateRequest, paginationSchema, linkFilterSchema } from '@/lib/validations';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const queryParams = Object.fromEntries(searchParams);

  // Validate pagination
  const paginationValidation = validateRequest(paginationSchema, queryParams);
  if (!paginationValidation.success) {
    return NextResponse.json(
      { error: 'Invalid pagination parameters', details: paginationValidation.errors },
      { status: 400 }
    );
  }

  const { page, limit } = paginationValidation.data;

  // Validate filters
  const filterValidation = validateRequest(linkFilterSchema, queryParams);
  if (!filterValidation.success) {
    return NextResponse.json(
      { error: 'Invalid filter parameters', details: filterValidation.errors },
      { status: 400 }
    );
  }

  const filters = filterValidation.data;

  // Build query with validated parameters
  // ... query logic
}
```

## Available Schemas

### Links
- `createLinkSchema` - Create new link
- `updateLinkSchema` - Update existing link
- `linkIdSchema` - Validate link ID parameter
- `linkFilterSchema` - Query parameters for filtering links

### Categories
- `createCategorySchema` - Create new category
- `updateCategorySchema` - Update existing category
- `categoryIdSchema` - Validate category ID parameter

### Tags
- `createTagSchema` - Create new tag
- `updateTagSchema` - Update existing tag
- `tagIdSchema` - Validate tag ID parameter
- `linkTagAssociationSchema` - Associate link with tag

### Widgets
- `createWidgetSchema` - Create new widget
- `updateWidgetSchema` - Update existing widget
- `widgetIdSchema` - Validate widget ID parameter

### Settings
- `updateSettingsSchema` - Update user settings

### Projects
- `createProjectSchema` - Create new project
- `updateProjectSchema` - Update existing project
- `projectIdSchema` - Validate project ID parameter

### Utility Schemas
- `scrapeUrlSchema` - Validate URL for scraping
- `importDataSchema` - Validate bulk import data
- `saveLayoutSchema` - Save grid layout configuration
- `paginationSchema` - Pagination query parameters
- `sortSchema` - Sorting query parameters

## TypeScript Types

All schemas have corresponding TypeScript types exported using `z.infer<>`:

```typescript
import type {
  CreateLinkInput,
  UpdateLinkInput,
  CreateCategoryInput,
  // ... etc
} from '@/lib/validations';

// Use in function signatures
async function createLink(data: CreateLinkInput) {
  // TypeScript knows the exact shape of data
  console.log(data.url); // ✓ Valid
  console.log(data.unknownField); // ✗ TypeScript error
}
```

## Validation Helper

The `validateRequest` helper function provides a type-safe way to validate data:

```typescript
function validateRequest<T>(
  schema: ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: string[] }
```

**Returns:**
- On success: `{ success: true, data: T }` where T is the validated and typed data
- On failure: `{ success: false, errors: string[] }` with human-readable error messages

## Error Messages

All schemas include custom error messages for better UX:

```typescript
// Example validation errors:
{
  "error": "Validation failed",
  "details": [
    "url: Must be a valid URL",
    "title: Title must be 255 characters or less",
    "categoryId: Invalid UUID format"
  ]
}
```

## Schema Features

### Links Schema
- URL validation (must be valid URL format)
- Title: 1-255 characters, required
- Description: optional string
- Category ID: optional UUID
- Boolean flags with defaults (isFavorite)
- Metadata fields (siteName, author, publishedAt)
- Platform detection fields (platform, contentType, platformColor)

### Categories Schema
- Name: 1-100 characters, required
- Optional description, icon (Lucide icon name), and color
- Order field for sorting

### Tags Schema
- Name: 1-50 characters, required, unique
- Optional color
- Order field for sorting

### Widgets Schema
- Type: enum of 42 valid widget types
- Size: enum of 5 sizes (small, medium, large, wide, tall)
- Optional title, projectId, categoryId, tagId
- Flexible config object (Record<string, unknown>)
- Layout position fields (x, y, w, h) with integer validation
- Visibility flag

### Settings Schema
- Theme: light | dark | system
- View density: compact | normal | comfortable
- View mode: bento | kanban
- Boolean flags: showTooltips, reduceMotion

### Import Schema
- Arrays of links, categories, and tags
- Each with appropriate field validation
- Links can include tag names for automatic association

## Best Practices

1. **Always validate user input** before processing or storing in database
2. **Return 400 status** for validation errors with details
3. **Use TypeScript types** from schemas for type safety
4. **Provide clear error messages** from the validation.errors array
5. **Validate path parameters** using dedicated ID schemas
6. **Validate query parameters** for filtering, pagination, and sorting
7. **Use the helper function** for consistent error handling

## Migration Path

To add validation to an existing API route:

1. Import the appropriate schema and validateRequest helper
2. Validate the request body/params before processing
3. Return 400 with error details if validation fails
4. Use the typed validation.data for database operations
5. Update error handling to distinguish validation errors from server errors

Example:

```typescript
// Before
export async function POST(request: NextRequest) {
  const body = await request.json();
  // Direct database insert without validation
  await db.insert(links).values(body);
}

// After
export async function POST(request: NextRequest) {
  const body = await request.json();

  const validation = validateRequest(createLinkSchema, body);
  if (!validation.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: validation.errors },
      { status: 400 }
    );
  }

  await db.insert(links).values(validation.data);
}
```
