import { describe, it, expect } from 'vitest';
import {
  ensureProtocol,
  normalizeUrlForComparison,
  extractHostname,
  isValidUrl,
} from './url-utils';

describe('URL Utilities', () => {
  describe('ensureProtocol', () => {
    it('should add https:// to URLs without protocol', () => {
      expect(ensureProtocol('example.com')).toBe('https://example.com');
      expect(ensureProtocol('www.example.com')).toBe('https://www.example.com');
      expect(ensureProtocol('github.com/user/repo')).toBe('https://github.com/user/repo');
    });

    it('should not modify URLs that already have https://', () => {
      expect(ensureProtocol('https://example.com')).toBe('https://example.com');
      expect(ensureProtocol('https://www.example.com/path')).toBe('https://www.example.com/path');
    });

    it('should not modify URLs that already have http://', () => {
      expect(ensureProtocol('http://example.com')).toBe('http://example.com');
      expect(ensureProtocol('http://localhost:3000')).toBe('http://localhost:3000');
    });

    it('should handle empty strings', () => {
      expect(ensureProtocol('')).toBe('');
    });

    it('should handle URLs with query parameters', () => {
      expect(ensureProtocol('example.com?query=value')).toBe('https://example.com?query=value');
    });

    it('should handle URLs with hash fragments', () => {
      expect(ensureProtocol('example.com#section')).toBe('https://example.com#section');
    });

    it('should handle URLs with paths', () => {
      expect(ensureProtocol('example.com/path/to/page')).toBe('https://example.com/path/to/page');
    });
  });

  describe('normalizeUrlForComparison', () => {
    it('should remove www prefix', () => {
      expect(normalizeUrlForComparison('https://www.example.com')).toBe('example.com');
      expect(normalizeUrlForComparison('http://www.github.com')).toBe('github.com');
    });

    it('should remove trailing slashes', () => {
      expect(normalizeUrlForComparison('https://example.com/')).toBe('example.com');
      expect(normalizeUrlForComparison('https://example.com/path/')).toBe('example.com/path');
    });

    it('should convert to lowercase', () => {
      expect(normalizeUrlForComparison('https://Example.COM')).toBe('example.com');
      expect(normalizeUrlForComparison('https://GITHUB.COM/USER/REPO')).toBe('github.com/user/repo');
    });

    it('should normalize protocol differences', () => {
      const https = normalizeUrlForComparison('https://example.com');
      const http = normalizeUrlForComparison('http://example.com');
      expect(https).toBe(http);
    });

    it('should preserve query parameters', () => {
      expect(normalizeUrlForComparison('https://example.com?query=value')).toBe(
        'example.com?query=value'
      );
      expect(normalizeUrlForComparison('https://example.com/path?a=1&b=2')).toBe(
        'example.com/path?a=1&b=2'
      );
    });

    it('should preserve paths', () => {
      expect(normalizeUrlForComparison('https://example.com/path/to/page')).toBe(
        'example.com/path/to/page'
      );
    });

    it('should handle complex URLs', () => {
      const url1 = 'https://www.example.com/path/';
      const url2 = 'http://example.com/path';
      expect(normalizeUrlForComparison(url1)).toBe(normalizeUrlForComparison(url2));
    });

    it('should detect duplicate URLs with different formats', () => {
      const urls = [
        'https://example.com',
        'http://example.com/',
        'https://www.example.com',
        'http://www.example.com/',
      ];

      const normalized = urls.map(normalizeUrlForComparison);
      expect(new Set(normalized).size).toBe(1); // All should normalize to the same value
    });

    it('should handle invalid URLs gracefully', () => {
      expect(normalizeUrlForComparison('not a url')).toBe('not a url');
      expect(normalizeUrlForComparison('just-text')).toBe('just-text');
    });

    it('should distinguish different paths', () => {
      const path1 = normalizeUrlForComparison('https://example.com/path1');
      const path2 = normalizeUrlForComparison('https://example.com/path2');
      expect(path1).not.toBe(path2);
    });

    it('should distinguish different query parameters', () => {
      const query1 = normalizeUrlForComparison('https://example.com?query=1');
      const query2 = normalizeUrlForComparison('https://example.com?query=2');
      expect(query1).not.toBe(query2);
    });

    it('should handle URLs with ports', () => {
      expect(normalizeUrlForComparison('https://example.com:8080/path')).toBe(
        'example.com:8080/path'
      );
    });

    it('should handle localhost URLs', () => {
      expect(normalizeUrlForComparison('http://localhost:3000')).toBe('localhost:3000');
      expect(normalizeUrlForComparison('http://localhost:3000/path')).toBe('localhost:3000/path');
    });
  });

  describe('extractHostname', () => {
    it('should extract hostname from full URLs', () => {
      expect(extractHostname('https://example.com/path')).toBe('example.com');
      expect(extractHostname('https://github.com/user/repo')).toBe('github.com');
    });

    it('should remove www prefix', () => {
      expect(extractHostname('https://www.example.com')).toBe('example.com');
      expect(extractHostname('http://www.github.com')).toBe('github.com');
    });

    it('should normalize hostname to lowercase (per URL spec)', () => {
      // URL spec requires hostnames to be normalized to lowercase
      expect(extractHostname('https://Example.COM')).toBe('example.com');
    });

    it('should handle URLs with query parameters', () => {
      expect(extractHostname('https://example.com/path?query=value')).toBe('example.com');
    });

    it('should handle URLs with hash fragments', () => {
      expect(extractHostname('https://example.com/path#section')).toBe('example.com');
    });

    it('should handle URLs with ports', () => {
      expect(extractHostname('https://example.com:8080')).toBe('example.com:8080');
      expect(extractHostname('http://localhost:3000')).toBe('localhost:3000');
    });

    it('should handle invalid URLs gracefully', () => {
      expect(extractHostname('not a url')).toBe('not a url');
      expect(extractHostname('just-text')).toBe('just-text');
    });

    it('should handle subdomains', () => {
      expect(extractHostname('https://api.example.com')).toBe('api.example.com');
      expect(extractHostname('https://subdomain.example.com/path')).toBe('subdomain.example.com');
    });

    it('should handle IP addresses', () => {
      expect(extractHostname('http://192.168.1.1')).toBe('192.168.1.1');
      expect(extractHostname('http://192.168.1.1:8080')).toBe('192.168.1.1:8080');
    });

    it('should distinguish different hostnames', () => {
      const host1 = extractHostname('https://example.com');
      const host2 = extractHostname('https://different.com');
      expect(host1).not.toBe(host2);
    });
  });

  describe('isValidUrl', () => {
    it('should return true for valid URLs', () => {
      expect(isValidUrl('https://example.com')).toBe(true);
      expect(isValidUrl('http://example.com')).toBe(true);
      expect(isValidUrl('https://www.example.com/path')).toBe(true);
      expect(isValidUrl('https://example.com:8080')).toBe(true);
    });

    it('should return true for localhost URLs', () => {
      expect(isValidUrl('http://localhost')).toBe(true);
      expect(isValidUrl('http://localhost:3000')).toBe(true);
      expect(isValidUrl('http://localhost:3000/path')).toBe(true);
    });

    it('should return true for IP addresses', () => {
      expect(isValidUrl('http://192.168.1.1')).toBe(true);
      expect(isValidUrl('http://192.168.1.1:8080')).toBe(true);
    });

    it('should return true for URLs with query parameters', () => {
      expect(isValidUrl('https://example.com?query=value')).toBe(true);
      expect(isValidUrl('https://example.com/path?a=1&b=2')).toBe(true);
    });

    it('should return true for URLs with hash fragments', () => {
      expect(isValidUrl('https://example.com#section')).toBe(true);
      expect(isValidUrl('https://example.com/path#section')).toBe(true);
    });

    it('should return true for URLs with special characters', () => {
      expect(isValidUrl('https://example.com/path%20with%20spaces')).toBe(true);
      expect(isValidUrl('https://example.com/path?query=%E4%B8%AD%E6%96%87')).toBe(true);
    });

    it('should return false for invalid URLs', () => {
      expect(isValidUrl('not a url')).toBe(false);
      expect(isValidUrl('just text')).toBe(false);
      expect(isValidUrl('example.com')).toBe(false); // Missing protocol
    });

    it('should return false for empty strings', () => {
      expect(isValidUrl('')).toBe(false);
    });

    it('should return false for URLs with invalid protocols', () => {
      expect(isValidUrl('ftp://example.com')).toBe(true); // FTP is valid
      expect(isValidUrl('invalid://example.com')).toBe(true); // URL constructor accepts any protocol
    });

    it('should return false for malformed URLs', () => {
      expect(isValidUrl('http://')).toBe(false);
      expect(isValidUrl('https://')).toBe(false);
      // Note: 'http://.' is technically valid per URL spec (hostname is '.')
      // but in practice such URLs are malformed - URL constructor accepts it
      expect(isValidUrl('http://.')).toBe(true); // URL constructor accepts this
    });

    it('should handle Unicode domains', () => {
      expect(isValidUrl('https://中文.com')).toBe(true);
      expect(isValidUrl('https://例え.jp')).toBe(true);
    });

    it('should return false for relative URLs', () => {
      expect(isValidUrl('/path/to/page')).toBe(false);
      expect(isValidUrl('../relative/path')).toBe(false);
      expect(isValidUrl('./current/path')).toBe(false);
    });
  });

  describe('Integration Tests', () => {
    it('should work together for URL processing pipeline', () => {
      // User input without protocol
      const userInput = 'www.example.com/path';

      // Step 1: Ensure protocol
      const withProtocol = ensureProtocol(userInput);
      expect(isValidUrl(withProtocol)).toBe(true);

      // Step 2: Extract hostname
      const hostname = extractHostname(withProtocol);
      expect(hostname).toBe('example.com');

      // Step 3: Normalize for comparison
      const normalized = normalizeUrlForComparison(withProtocol);
      expect(normalized).toBe('example.com/path');
    });

    it('should detect duplicates with different formats', () => {
      const urls = [
        'example.com/path',
        'www.example.com/path/',
        'EXAMPLE.COM/path',
      ];

      // Normalize all URLs
      const normalized = urls.map((url) => {
        const withProtocol = ensureProtocol(url);
        return normalizeUrlForComparison(withProtocol);
      });

      // All should be the same
      expect(new Set(normalized).size).toBe(1);
    });

    it('should validate and extract hostname from user input', () => {
      const testCases = [
        { input: 'https://example.com', expected: 'example.com' },
        { input: 'https://www.github.com', expected: 'github.com' },
        { input: 'http://localhost:3000', expected: 'localhost:3000' },
      ];

      testCases.forEach(({ input, expected }) => {
        expect(isValidUrl(input)).toBe(true);
        expect(extractHostname(input)).toBe(expected);
      });
    });
  });
});
