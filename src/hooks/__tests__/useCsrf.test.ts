/**
 * useCsrf Hook Tests
 *
 * Tests for the CSRF token utilities
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getCsrfToken, getCsrfHeaders } from '../useCsrf';

describe('useCsrf utilities', () => {
  const originalDocument = global.document;

  beforeEach(() => {
    // Reset document cookie
    Object.defineProperty(global, 'document', {
      value: {
        cookie: '',
      },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    Object.defineProperty(global, 'document', {
      value: originalDocument,
      writable: true,
      configurable: true,
    });
  });

  describe('getCsrfToken', () => {
    it('should return null when no csrf cookie exists', () => {
      document.cookie = 'other-cookie=value';
      const token = getCsrfToken();
      expect(token).toBeNull();
    });

    it('should return token when csrf cookie exists', () => {
      document.cookie = 'csrf-token=test-token-value';
      const token = getCsrfToken();
      expect(token).toBe('test-token-value');
    });

    it('should find csrf token among multiple cookies', () => {
      document.cookie = 'first=one; csrf-token=my-csrf-token; last=three';
      const token = getCsrfToken();
      expect(token).toBe('my-csrf-token');
    });

    it('should decode URI encoded token', () => {
      document.cookie = 'csrf-token=' + encodeURIComponent('token/with+special=chars');
      const token = getCsrfToken();
      expect(token).toBe('token/with+special=chars');
    });

    it('should handle empty cookie string', () => {
      document.cookie = '';
      const token = getCsrfToken();
      expect(token).toBeNull();
    });

    it('should return null when document is undefined', () => {
      // Temporarily make document undefined
      const savedDocument = global.document;
      // @ts-expect-error - intentionally setting to undefined
      global.document = undefined;

      const token = getCsrfToken();
      expect(token).toBeNull();

      global.document = savedDocument;
    });
  });

  describe('getCsrfHeaders', () => {
    it('should return empty object when no token', () => {
      document.cookie = '';
      const headers = getCsrfHeaders();
      expect(headers).toEqual({});
    });

    it('should return headers with token when available', () => {
      document.cookie = 'csrf-token=my-secure-token';
      const headers = getCsrfHeaders();
      expect(headers).toEqual({
        'X-CSRF-Token': 'my-secure-token',
      });
    });

    it('should work with multiple cookies', () => {
      document.cookie = 'session=abc; csrf-token=secret123; tracking=xyz';
      const headers = getCsrfHeaders();
      expect(headers['X-CSRF-Token']).toBe('secret123');
    });

    it('should return empty object when document is undefined', () => {
      const savedDocument = global.document;
      // @ts-expect-error - intentionally setting to undefined
      global.document = undefined;

      const headers = getCsrfHeaders();
      expect(headers).toEqual({});

      global.document = savedDocument;
    });
  });
});
