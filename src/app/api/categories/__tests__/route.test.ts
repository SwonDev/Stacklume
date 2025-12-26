/**
 * Categories API Route Tests
 *
 * Tests for the /api/categories endpoint
 * Focuses on request validation and basic error handling
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST, PATCH, DELETE } from '../route';

// Mock data
const mockCategories = [
  {
    id: 'cat-1',
    name: 'Development',
    description: 'Development links',
    icon: 'code',
    color: 'blue',
    order: 0,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
];

// Mock the database module
vi.mock('@/lib/db', () => {
  const mockDb = {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        orderBy: vi.fn(() => Promise.resolve([])),
      })),
    })),
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        returning: vi.fn(() => Promise.resolve([{}])),
      })),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => ({
          returning: vi.fn(() => Promise.resolve([{}])),
        })),
      })),
    })),
    delete: vi.fn(() => ({
      where: vi.fn(() => ({
        returning: vi.fn(() => Promise.resolve([{}])),
      })),
    })),
  };

  return {
    db: mockDb,
    categories: { createdAt: 'createdAt', id: 'id' },
    links: { categoryId: 'categoryId' },
    withRetry: vi.fn((operation) => operation()),
    createPaginatedResponse: vi.fn((data, page, limit, total) => ({
      data,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    })),
  };
});

// Mock drizzle-orm with all needed exports
vi.mock('drizzle-orm', () => ({
  desc: vi.fn(() => 'desc'),
  count: vi.fn(() => 'count'),
  eq: vi.fn((a, b) => ({ a, b })),
  isNull: vi.fn((a) => ({ isNull: a })),
  and: vi.fn((...args) => ({ and: args })),
  or: vi.fn((...args) => ({ or: args })),
  sql: vi.fn(),
}));

// Helper to create a mock NextRequest
type NextRequestInit = ConstructorParameters<typeof NextRequest>[1];
function createMockRequest(url: string, options: Partial<NextRequestInit> = {}): NextRequest {
  return new NextRequest(new URL(url, 'http://localhost:3000'), options);
}

describe('Categories API Routes', () => {
  beforeEach(async () => {
    vi.clearAllMocks();

    const db = await import('@/lib/db');

    // Setup default mock for GET requests - include the where chain
    vi.mocked(db.db.select).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockResolvedValue(mockCategories),
        }),
        orderBy: vi.fn().mockResolvedValue(mockCategories),
      }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
  });

  describe('GET /api/categories', () => {
    it('should return all categories without pagination params', async () => {
      const request = createMockRequest('http://localhost:3000/api/categories');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(Array.isArray(data)).toBe(true);
    });

    it('should handle database errors gracefully', async () => {
      const db = await import('@/lib/db');
      vi.mocked(db.withRetry).mockRejectedValueOnce(new Error('Database error'));

      const request = createMockRequest('http://localhost:3000/api/categories');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toHaveProperty('error');
    });
  });

  describe('POST /api/categories', () => {
    beforeEach(async () => {
      const db = await import('@/lib/db');

      vi.mocked(db.db.insert).mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{
            id: 'new-cat-id',
            name: 'Test Category',
            description: null,
            icon: 'folder',
            color: 'gold',
            order: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
          }]),
        }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);
    });

    it('should create a new category with valid data', async () => {
      const request = createMockRequest('http://localhost:3000/api/categories', {
        method: 'POST',
        body: JSON.stringify({ name: 'Test Category' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data).toHaveProperty('id');
    });

    it('should return 400 for missing name field', async () => {
      const request = createMockRequest('http://localhost:3000/api/categories', {
        method: 'POST',
        body: JSON.stringify({ description: 'No name' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBeDefined();
    });

    it('should return 400 for empty name', async () => {
      const request = createMockRequest('http://localhost:3000/api/categories', {
        method: 'POST',
        body: JSON.stringify({ name: '' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBeDefined();
    });

    it('should handle database errors on create', async () => {
      const db = await import('@/lib/db');
      vi.mocked(db.withRetry).mockRejectedValueOnce(new Error('Database error'));

      const request = createMockRequest('http://localhost:3000/api/categories', {
        method: 'POST',
        body: JSON.stringify({ name: 'Test' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toHaveProperty('error');
    });
  });

  describe('PATCH /api/categories', () => {
    beforeEach(async () => {
      const db = await import('@/lib/db');

      vi.mocked(db.db.update).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([{
              id: 'cat-1',
              name: 'Updated Category',
              description: null,
              icon: 'folder',
              color: 'blue',
              order: 0,
              createdAt: new Date(),
              updatedAt: new Date(),
            }]),
          }),
        }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);
    });

    it('should update an existing category', async () => {
      const request = createMockRequest('http://localhost:3000/api/categories', {
        method: 'PATCH',
        body: JSON.stringify({ id: 'cat-1', name: 'Updated Category' }),
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.name).toBe('Updated Category');
    });

    it('should return 400 for missing ID', async () => {
      const request = createMockRequest('http://localhost:3000/api/categories', {
        method: 'PATCH',
        body: JSON.stringify({ name: 'Updated' }),
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('ID');
    });

    it('should return 404 for non-existent category', async () => {
      const db = await import('@/lib/db');

      vi.mocked(db.db.update).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([]),
          }),
        }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      const request = createMockRequest('http://localhost:3000/api/categories', {
        method: 'PATCH',
        body: JSON.stringify({ id: 'non-existent', name: 'Test' }),
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data).toHaveProperty('error');
    });
  });

  describe('DELETE /api/categories', () => {
    it('should return 400 for missing ID', async () => {
      const request = createMockRequest('http://localhost:3000/api/categories');
      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toHaveProperty('error');
    });

    it('should handle database errors', async () => {
      const db = await import('@/lib/db');
      vi.mocked(db.withRetry).mockRejectedValueOnce(new Error('Database error'));

      const request = createMockRequest('http://localhost:3000/api/categories?id=cat-1');
      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toHaveProperty('error');
    });
  });
});
