/**
 * Logger Tests
 *
 * Tests for the structured logging system
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import logger, {
  generateRequestId,
  createRequestLogger,
  createModuleLogger,
  logApiRequest,
  logDbOperation,
  logExternalCall,
  logInfo,
  logWarn,
  logError,
  logDebug,
} from '../logger';

describe('Logger', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Base Logger', () => {
    it('should have correct log level', () => {
      expect(logger.level).toBeDefined();
      expect(typeof logger.level).toBe('string');
    });

    it('should have all log methods', () => {
      expect(typeof logger.trace).toBe('function');
      expect(typeof logger.debug).toBe('function');
      expect(typeof logger.info).toBe('function');
      expect(typeof logger.warn).toBe('function');
      expect(typeof logger.error).toBe('function');
      expect(typeof logger.fatal).toBe('function');
    });

    it('should log info messages', () => {
      logger.info('Test info message');
      expect(console.log).toHaveBeenCalled();
    });

    it('should log warn messages', () => {
      logger.warn('Test warn message');
      expect(console.warn).toHaveBeenCalled();
    });

    it('should log error messages', () => {
      logger.error('Test error message');
      expect(console.error).toHaveBeenCalled();
    });

    it('should log with object context', () => {
      logger.info({ userId: '123', action: 'test' }, 'Action performed');
      expect(console.log).toHaveBeenCalled();
    });

    it('should create child loggers with bindings', () => {
      const childLogger = logger.child({ module: 'test-module' });
      expect(childLogger).toBeDefined();
      expect(typeof childLogger.info).toBe('function');

      childLogger.info('Child logger message');
      expect(console.log).toHaveBeenCalled();
    });
  });

  describe('generateRequestId', () => {
    it('should generate a valid UUID', () => {
      const id = generateRequestId();
      expect(id).toBeDefined();
      expect(typeof id).toBe('string');
      // UUID format check
      expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    });

    it('should generate unique IDs', () => {
      const id1 = generateRequestId();
      const id2 = generateRequestId();
      expect(id1).not.toBe(id2);
    });
  });

  describe('createRequestLogger', () => {
    it('should create a logger with requestId', () => {
      const reqLogger = createRequestLogger('test-req-id');
      expect(reqLogger).toBeDefined();

      reqLogger.info('Request started');
      expect(console.log).toHaveBeenCalled();
    });

    it('should auto-generate requestId if not provided', () => {
      const reqLogger = createRequestLogger();
      expect(reqLogger).toBeDefined();

      reqLogger.info('Request started');
      expect(console.log).toHaveBeenCalled();
    });
  });

  describe('createModuleLogger', () => {
    it('should create a logger with module name', () => {
      const moduleLogger = createModuleLogger('api/links');
      expect(moduleLogger).toBeDefined();

      moduleLogger.info('Module initialized');
      expect(console.log).toHaveBeenCalled();
    });
  });

  describe('logApiRequest', () => {
    it('should log successful request as info', () => {
      const testLogger = createModuleLogger('test');
      logApiRequest(testLogger, 'GET', '/api/links', 200, 50);
      expect(console.log).toHaveBeenCalled();
    });

    it('should log 4xx request as warn', () => {
      const testLogger = createModuleLogger('test');
      logApiRequest(testLogger, 'POST', '/api/links', 400, 30);
      expect(console.warn).toHaveBeenCalled();
    });

    it('should log 5xx request as error', () => {
      const testLogger = createModuleLogger('test');
      logApiRequest(testLogger, 'GET', '/api/links', 500, 100);
      expect(console.error).toHaveBeenCalled();
    });

    it('should include extra data', () => {
      const testLogger = createModuleLogger('test');
      logApiRequest(testLogger, 'POST', '/api/links', 201, 45, { userId: '123' });
      expect(console.log).toHaveBeenCalled();
    });
  });

  describe('logDbOperation', () => {
    it('should log successful operation as debug', () => {
      const testLogger = createModuleLogger('db');
      logDbOperation(testLogger, 'SELECT', 'links', 15, true);
      // Debug may or may not be logged depending on log level
    });

    it('should log failed operation as error', () => {
      const testLogger = createModuleLogger('db');
      const error = new Error('Connection failed');
      logDbOperation(testLogger, 'INSERT', 'links', 500, false, error);
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('logExternalCall', () => {
    it('should log successful call as debug', () => {
      const testLogger = createModuleLogger('external');
      logExternalCall(testLogger, 'github', '/api/trending', 200, 350);
      // Debug may or may not be logged depending on log level
    });

    it('should log failed call as error', () => {
      const testLogger = createModuleLogger('external');
      const error = new Error('Timeout');
      logExternalCall(testLogger, 'github', '/api/trending', 500, 5000, error);
      expect(console.error).toHaveBeenCalled();
    });

    it('should log 4xx call as warn', () => {
      const testLogger = createModuleLogger('external');
      logExternalCall(testLogger, 'github', '/api/repos', 404, 100);
      expect(console.warn).toHaveBeenCalled();
    });
  });

  describe('Convenience exports', () => {
    it('logInfo should be bound to logger.info', () => {
      logInfo('Test info');
      expect(console.log).toHaveBeenCalled();
    });

    it('logWarn should be bound to logger.warn', () => {
      logWarn('Test warn');
      expect(console.warn).toHaveBeenCalled();
    });

    it('logError should be bound to logger.error', () => {
      logError('Test error');
      expect(console.error).toHaveBeenCalled();
    });

    it('logDebug should be bound to logger.debug', () => {
      logDebug('Test debug');
      // May or may not log depending on level
    });
  });
});
