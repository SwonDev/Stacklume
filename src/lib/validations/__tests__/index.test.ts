/**
 * Validation Schema Tests
 *
 * Tests for Zod validation schemas and the validateRequest helper
 */

import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import {
  validateRequest,
  createLinkSchema,
  updateLinkSchema,
  createCategorySchema,
  createTagSchema,
  createWidgetSchema,
  createProjectSchema,
  updateSettingsSchema,
  scrapeUrlSchema,
  linkIdSchema,
  bulkImportSchema,
} from '../index';

describe('validateRequest', () => {
  const testSchema = z.object({
    name: z.string().min(1),
    age: z.number().positive(),
  });

  it('should return success with validated data for valid input', () => {
    const result = validateRequest(testSchema, { name: 'John', age: 25 });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({ name: 'John', age: 25 });
    }
  });

  it('should return failure with errors for invalid input', () => {
    const result = validateRequest(testSchema, { name: '', age: -5 });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(e => e.includes('name'))).toBe(true);
      expect(result.errors.some(e => e.includes('age'))).toBe(true);
    }
  });

  it('should return failure for missing required fields', () => {
    const result = validateRequest(testSchema, { name: 'John' });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.some(e => e.includes('age'))).toBe(true);
    }
  });

  it('should handle non-object input gracefully', () => {
    const result = validateRequest(testSchema, 'invalid');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.length).toBeGreaterThan(0);
    }
  });

  it('should handle null input', () => {
    const result = validateRequest(testSchema, null);

    expect(result.success).toBe(false);
  });

  it('should handle undefined input', () => {
    const result = validateRequest(testSchema, undefined);

    expect(result.success).toBe(false);
  });
});

describe('createLinkSchema', () => {
  it('should validate a valid link', () => {
    const validLink = {
      url: 'https://example.com',
      title: 'Example Site',
    };

    const result = validateRequest(createLinkSchema, validLink);
    expect(result.success).toBe(true);
  });

  it('should validate link with all optional fields', () => {
    const fullLink = {
      url: 'https://example.com',
      title: 'Example Site',
      description: 'A test site',
      imageUrl: 'https://example.com/image.jpg',
      faviconUrl: 'https://example.com/favicon.ico',
      categoryId: '550e8400-e29b-41d4-a716-446655440000',
      isFavorite: true,
      siteName: 'Example',
      author: 'John Doe',
      platform: 'youtube',
      contentType: 'video',
      platformColor: '#ff0000',
    };

    const result = validateRequest(createLinkSchema, fullLink);
    expect(result.success).toBe(true);
  });

  it('should reject invalid URL', () => {
    const invalidLink = {
      url: 'not-a-url',
      title: 'Example',
    };

    const result = validateRequest(createLinkSchema, invalidLink);
    expect(result.success).toBe(false);
  });

  it('should reject missing title', () => {
    const missingTitle = {
      url: 'https://example.com',
    };

    const result = validateRequest(createLinkSchema, missingTitle);
    expect(result.success).toBe(false);
  });

  it('should reject title that is too long', () => {
    const longTitle = {
      url: 'https://example.com',
      title: 'x'.repeat(300),
    };

    const result = validateRequest(createLinkSchema, longTitle);
    expect(result.success).toBe(false);
  });

  it('should accept null for nullable fields', () => {
    const linkWithNulls = {
      url: 'https://example.com',
      title: 'Example',
      imageUrl: null,
      faviconUrl: null,
      categoryId: null,
    };

    const result = validateRequest(createLinkSchema, linkWithNulls);
    expect(result.success).toBe(true);
  });
});

describe('updateLinkSchema', () => {
  it('should validate partial update', () => {
    const partialUpdate = {
      title: 'Updated Title',
    };

    const result = validateRequest(updateLinkSchema, partialUpdate);
    expect(result.success).toBe(true);
  });

  it('should allow empty object (no updates)', () => {
    const result = validateRequest(updateLinkSchema, {});
    expect(result.success).toBe(true);
  });

  it('should reject empty title', () => {
    const result = validateRequest(updateLinkSchema, { title: '' });
    expect(result.success).toBe(false);
  });
});

describe('createCategorySchema', () => {
  it('should validate a valid category', () => {
    const category = {
      name: 'Development',
    };

    const result = validateRequest(createCategorySchema, category);
    expect(result.success).toBe(true);
  });

  it('should validate category with all fields', () => {
    const category = {
      name: 'Development',
      description: 'Dev resources',
      icon: 'Code',
      color: '#6366f1',
      order: 1,
    };

    const result = validateRequest(createCategorySchema, category);
    expect(result.success).toBe(true);
  });

  it('should reject missing name', () => {
    const result = validateRequest(createCategorySchema, {});
    expect(result.success).toBe(false);
  });

  it('should reject name that is too long', () => {
    const result = validateRequest(createCategorySchema, {
      name: 'x'.repeat(150),
    });
    expect(result.success).toBe(false);
  });
});

describe('createTagSchema', () => {
  it('should validate a valid tag', () => {
    const tag = {
      name: 'important',
    };

    const result = validateRequest(createTagSchema, tag);
    expect(result.success).toBe(true);
  });

  it('should validate tag with color and order', () => {
    const tag = {
      name: 'urgent',
      color: '#ef4444',
      order: 5,
    };

    const result = validateRequest(createTagSchema, tag);
    expect(result.success).toBe(true);
  });

  it('should reject tag name too long', () => {
    const result = validateRequest(createTagSchema, {
      name: 'x'.repeat(60),
    });
    expect(result.success).toBe(false);
  });
});

describe('createWidgetSchema', () => {
  it('should validate a valid widget', () => {
    const widget = {
      type: 'clock',
    };

    const result = validateRequest(createWidgetSchema, widget);
    expect(result.success).toBe(true);
  });

  it('should validate widget with all fields', () => {
    const widget = {
      type: 'notes',
      title: 'My Notes',
      size: 'large',
      projectId: '550e8400-e29b-41d4-a716-446655440000',
      config: { theme: 'dark' },
      layoutX: 0,
      layoutY: 0,
      layoutW: 4,
      layoutH: 3,
      isVisible: true,
    };

    const result = validateRequest(createWidgetSchema, widget);
    expect(result.success).toBe(true);
  });

  it('should reject invalid widget type', () => {
    const result = validateRequest(createWidgetSchema, {
      type: 'invalid-type',
    });
    expect(result.success).toBe(false);
  });

  it('should reject invalid size', () => {
    const result = validateRequest(createWidgetSchema, {
      type: 'clock',
      size: 'extra-large',
    });
    expect(result.success).toBe(false);
  });

  it('should accept various valid widget types', () => {
    const validTypes = [
      'favorites', 'recent', 'notes', 'todo', 'calendar',
      'weather', 'clock', 'calculator', 'json-formatter',
      'gradient-generator', 'sprite-sheet', 'github-trending',
    ];

    for (const type of validTypes) {
      const result = validateRequest(createWidgetSchema, { type });
      expect(result.success).toBe(true);
    }
  });
});

describe('createProjectSchema', () => {
  it('should validate a valid project', () => {
    const project = {
      name: 'Work',
    };

    const result = validateRequest(createProjectSchema, project);
    expect(result.success).toBe(true);
  });

  it('should validate project with all fields', () => {
    const project = {
      name: 'Personal',
      description: 'Personal projects',
      icon: 'Home',
      color: '#10b981',
      order: 2,
      isDefault: false,
    };

    const result = validateRequest(createProjectSchema, project);
    expect(result.success).toBe(true);
  });

  it('should reject empty name', () => {
    const result = validateRequest(createProjectSchema, {
      name: '',
    });
    expect(result.success).toBe(false);
  });
});

describe('updateSettingsSchema', () => {
  it('should validate valid settings', () => {
    const settings = {
      theme: 'dark',
      viewDensity: 'compact',
      viewMode: 'kanban',
    };

    const result = validateRequest(updateSettingsSchema, settings);
    expect(result.success).toBe(true);
  });

  it('should validate partial settings', () => {
    const result = validateRequest(updateSettingsSchema, {
      theme: 'system',
    });
    expect(result.success).toBe(true);
  });

  it('should accept boolean settings', () => {
    const result = validateRequest(updateSettingsSchema, {
      showTooltips: true,
      reduceMotion: false,
    });
    expect(result.success).toBe(true);
  });

  it('should reject invalid theme', () => {
    const result = validateRequest(updateSettingsSchema, {
      theme: 'purple',
    });
    expect(result.success).toBe(false);
  });

  it('should reject invalid viewMode', () => {
    const result = validateRequest(updateSettingsSchema, {
      viewMode: 'grid',
    });
    expect(result.success).toBe(false);
  });
});

describe('scrapeUrlSchema', () => {
  it('should validate HTTPS URL', () => {
    const result = validateRequest(scrapeUrlSchema, {
      url: 'https://example.com',
    });
    expect(result.success).toBe(true);
  });

  it('should validate HTTP URL', () => {
    const result = validateRequest(scrapeUrlSchema, {
      url: 'http://example.com',
    });
    expect(result.success).toBe(true);
  });

  it('should reject FTP URL', () => {
    const result = validateRequest(scrapeUrlSchema, {
      url: 'ftp://example.com',
    });
    expect(result.success).toBe(false);
  });

  it('should reject missing protocol', () => {
    const result = validateRequest(scrapeUrlSchema, {
      url: 'example.com',
    });
    expect(result.success).toBe(false);
  });
});

describe('linkIdSchema', () => {
  it('should validate valid UUID', () => {
    const result = validateRequest(linkIdSchema, {
      id: '550e8400-e29b-41d4-a716-446655440000',
    });
    expect(result.success).toBe(true);
  });

  it('should reject invalid UUID', () => {
    const result = validateRequest(linkIdSchema, {
      id: 'not-a-uuid',
    });
    expect(result.success).toBe(false);
  });

  it('should reject empty ID', () => {
    const result = validateRequest(linkIdSchema, {
      id: '',
    });
    expect(result.success).toBe(false);
  });
});

describe('bulkImportSchema', () => {
  it('should validate valid import', () => {
    const data = {
      links: [
        { url: 'https://example1.com' },
        { url: 'https://example2.com', title: 'Example 2' },
      ],
    };

    const result = validateRequest(bulkImportSchema, data);
    expect(result.success).toBe(true);
  });

  it('should reject empty links array', () => {
    const result = validateRequest(bulkImportSchema, {
      links: [],
    });
    expect(result.success).toBe(false);
  });

  it('should reject missing links', () => {
    const result = validateRequest(bulkImportSchema, {});
    expect(result.success).toBe(false);
  });

  it('should accept links with all optional fields', () => {
    const data = {
      links: [
        {
          url: 'https://example.com',
          title: 'Example',
          description: 'A test',
          categoryId: '550e8400-e29b-41d4-a716-446655440000',
          tagIds: ['550e8400-e29b-41d4-a716-446655440001'],
          isFavorite: true,
        },
      ],
    };

    const result = validateRequest(bulkImportSchema, data);
    expect(result.success).toBe(true);
  });
});
