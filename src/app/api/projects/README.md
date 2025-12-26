# Projects API Documentation

CRUD API routes for managing projects in Stacklume.

## Endpoints

### GET /api/projects
List all projects for the user, sorted by order.

**Response:**
```json
[
  {
    "id": "uuid",
    "userId": "default",
    "name": "My Project",
    "description": "Project description",
    "icon": "Folder",
    "color": "#6366f1",
    "order": 0,
    "isDefault": false,
    "createdAt": "2025-12-09T...",
    "updatedAt": "2025-12-09T..."
  }
]
```

### POST /api/projects
Create a new project.

**Request Body:**
```json
{
  "name": "New Project",
  "description": "Optional description",
  "icon": "FolderOpen",
  "color": "#8b5cf6",
  "order": 3,
  "isDefault": false
}
```

**Behavior:**
- If this is the first project, `isDefault` is automatically set to `true`
- If `isDefault` is set to `true`, all other projects are set to `false`
- If `order` is not provided, the project is added at the end
- Default `userId` is "default"
- Default `icon` is "Folder"
- Default `color` is "#6366f1"

**Response:** `201 Created`
```json
{
  "id": "uuid",
  "userId": "default",
  "name": "New Project",
  ...
}
```

### GET /api/projects/[id]
Get a single project by ID.

**Response:**
```json
{
  "id": "uuid",
  "userId": "default",
  "name": "My Project",
  ...
}
```

**Error:** `404 Not Found` if project doesn't exist

### PUT /api/projects/[id]
Update a project.

**Request Body:**
```json
{
  "name": "Updated Name",
  "description": "Updated description",
  "icon": "Star",
  "color": "#f59e0b",
  "isDefault": true
}
```

**Behavior:**
- If `isDefault` is set to `true`, all other projects are set to `false`
- `updatedAt` is automatically updated

**Response:**
```json
{
  "id": "uuid",
  "name": "Updated Name",
  ...
}
```

**Error:** `404 Not Found` if project doesn't exist

### DELETE /api/projects/[id]
Delete a project.

**Behavior:**
- Cannot delete the default project (returns `400 Bad Request`)
- Cascade delete removes all widgets associated with this project (handled by schema)

**Response:**
```json
{
  "success": true,
  "deleted": { ... },
  "widgetsAffected": 5
}
```

**Errors:**
- `404 Not Found` if project doesn't exist
- `400 Bad Request` if attempting to delete the default project

### PUT /api/projects/reorder
Reorder projects by updating their order field.

**Request Body:**
```json
{
  "projectOrders": [
    { "id": "uuid-1", "order": 0 },
    { "id": "uuid-2", "order": 1 },
    { "id": "uuid-3", "order": 2 }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "updated": 3,
  "projects": [ ... ]
}
```

**Error:** `400 Bad Request` if `projectOrders` is not an array

## Database Schema Reference

```typescript
export const projects = pgTable("projects", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: varchar("user_id", { length: 100 }).default("default"),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  icon: varchar("icon", { length: 50 }).default("Folder"),
  color: varchar("color", { length: 20 }).default("#6366f1"),
  order: integer("order").default(0).notNull(),
  isDefault: boolean("is_default").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
```

## Relations

- `projects` has many `widgets` (cascade delete)
- When a project is deleted, all associated widgets are also deleted

## Usage Examples

### Create a new project
```typescript
const response = await fetch('/api/projects', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'Work',
    icon: 'Briefcase',
    color: '#3b82f6',
  })
});
const project = await response.json();
```

### Update a project
```typescript
const response = await fetch(`/api/projects/${projectId}`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'Updated Name',
    color: '#ef4444',
  })
});
const updated = await response.json();
```

### Reorder projects
```typescript
const response = await fetch('/api/projects/reorder', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    projectOrders: projects.map((p, index) => ({
      id: p.id,
      order: index
    }))
  })
});
const result = await response.json();
```

### Delete a project
```typescript
const response = await fetch(`/api/projects/${projectId}`, {
  method: 'DELETE',
});
const result = await response.json();
```
