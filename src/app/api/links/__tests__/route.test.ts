/**
 * Links API Route Tests
 *
 * Tests for the /api/links endpoint
 * Focuses on request validation and basic error handling
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

import { GET, POST } from '../route';

// Mock data
const mockLinks = [
  {
    id: 'link-1',
    url: 'https://example.com',
    title: 'Example Link',
    description: 'Test description',
    imageUrl: null,
    faviconUrl: null,
    categoryId: null,
    isFavorite: false,
    siteName: null,
    author: null,
    source: 'manual',
    platform: null,
    contentType: null,
    platformColor: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
];

// Mock the database module - all DB operations go through withRetry
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
  };

  return {
    db: mockDb,
    links: { createdAt: 'createdAt' },
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

describe('Links API Routes', () => {
  beforeEach(async () => {
    vi.clearAllMocks();

    const db = await import('@/lib/db');

    // Setup default mock for GET requests - include the where chain for soft delete filtering
    vi.mocked(db.db.select).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockResolvedValue(mockLinks),
        }),
        orderBy: vi.fn().mockResolvedValue(mockLinks),
      }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
  });

  describe('GET /api/links', () => {
    it('should return all links without pagination params', async () => {
      const request = createMockRequest('http://localhost:3000/api/links');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(Array.isArray(data)).toBe(true);
    });

    it('should handle database errors gracefully', async () => {
      const db = await import('@/lib/db');
      vi.mocked(db.withRetry).mockRejectedValueOnce(new Error('Database connection failed'));

      const request = createMockRequest('http://localhost:3000/api/links');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toHaveProperty('error');
    });
  });

  describe('POST /api/links', () => {
    beforeEach(async () => {
      const db = await import('@/lib/db');

      // Setup mock for POST requests
      vi.mocked(db.db.insert).mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{
            id: 'new-link-id',
            url: 'https://example.com',
            title: 'Test Link',
            description: null,
            imageUrl: null,
            faviconUrl: null,
            categoryId: null,
            isFavorite: false,
            siteName: null,
            author: null,
            source: 'manual',
            platform: null,
            contentType: null,
            platformColor: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          }]),
        }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);
    });

    it('should create a new link with valid data', async () => {
      const request = createMockRequest('http://localhost:3000/api/links', {
        method: 'POST',
        body: JSON.stringify({
          url: 'https://example.com',
          title: 'Test Link',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data).toHaveProperty('id');
    });

    it('should return 400 for missing URL', async () => {
      const request = createMockRequest('http://localhost:3000/api/links', {
        method: 'POST',
        body: JSON.stringify({ title: 'Missing URL' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBeDefined();
    });

    it('should return 400 for missing title', async () => {
      const request = createMockRequest('http://localhost:3000/api/links', {
        method: 'POST',
        body: JSON.stringify({ url: 'https://example.com' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBeDefined();
    });

    it('should return 400 for invalid URL format', async () => {
      const request = createMockRequest('http://localhost:3000/api/links', {
        method: 'POST',
        body: JSON.stringify({
          url: 'not-a-valid-url',
          title: 'Invalid URL',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBeDefined();
    });

    it('should return 400 for empty title', async () => {
      const request = createMockRequest('http://localhost:3000/api/links', {
        method: 'POST',
        body: JSON.stringify({
          url: 'https://example.com',
          title: '',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBeDefined();
    });

    it('should handle database errors on create', async () => {
      const db = await import('@/lib/db');
      vi.mocked(db.withRetry).mockRejectedValueOnce(new Error('Database error'));

      const request = createMockRequest('http://localhost:3000/api/links', {
        method: 'POST',
        body: JSON.stringify({
          url: 'https://example.com',
          title: 'Test',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toHaveProperty('error');
    });
  });
});
