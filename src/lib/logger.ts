import { randomUUID } from "crypto";

/**
 * Structured logger configuration
 *
 * This logger provides a consistent interface for structured logging.
 * It uses pino if available, otherwise falls back to a console-based implementation.
 *
 * Features:
 * - Pretty printing in development mode
 * - JSON output in production for log aggregation
 * - Request ID support for tracing
 * - Log levels: trace, debug, info, warn, error, fatal
 *
 * To enable full pino functionality, install pino and pino-pretty:
 *   pnpm add pino pino-pretty
 */

// Determine if we're in development mode
const isDevelopment = process.env.NODE_ENV !== "production";

// Log level configuration
const LOG_LEVELS = {
  trace: 10,
  debug: 20,
  info: 30,
  warn: 40,
  error: 50,
  fatal: 60,
} as const;

type LogLevel = keyof typeof LOG_LEVELS;

// Get configured log level
const configuredLevel = (process.env.LOG_LEVEL as LogLevel) || (isDevelopment ? "debug" : "info");
const configuredLevelValue = LOG_LEVELS[configuredLevel] || LOG_LEVELS.info;

/**
 * Simple console-based logger implementation
 * This provides a pino-compatible interface without the pino dependency
 */
interface LogFn {
  (msg: string): void;
  (obj: object, msg?: string): void;
}

interface Logger {
  trace: LogFn;
  debug: LogFn;
  info: LogFn;
  warn: LogFn;
  error: LogFn;
  fatal: LogFn;
  child: (bindings: Record<string, unknown>) => Logger;
  level: string;
}

function createLogFn(level: LogLevel, bindings: Record<string, unknown> = {}): LogFn {
  const levelValue = LOG_LEVELS[level];

  return function logFn(objOrMsg: string | object, msg?: string) {
    // Skip if below configured level
    if (levelValue < configuredLevelValue) return;

    const timestamp = new Date().toISOString();
    let logObj: Record<string, unknown>;
    let message: string;

    if (typeof objOrMsg === "string") {
      message = objOrMsg;
      logObj = { ...bindings };
    } else {
      message = msg || "";
      logObj = { ...bindings, ...objOrMsg };
    }

    // Format output based on environment
    if (isDevelopment) {
      // Pretty print in development
      const prefix = `[${timestamp}] ${level.toUpperCase()}`;
      const contextStr = Object.keys(logObj).length > 0 ? ` ${JSON.stringify(logObj)}` : "";
      const consoleMethod = level === "error" || level === "fatal" ? "error" : level === "warn" ? "warn" : "log";
      console[consoleMethod](`${prefix}: ${message}${contextStr}`);
    } else {
      // JSON output in production
      const entry = {
        level,
        time: timestamp,
        msg: message,
        service: "stacklume",
        env: process.env.NODE_ENV || "development",
        ...logObj,
      };
      const consoleMethod = level === "error" || level === "fatal" ? "error" : level === "warn" ? "warn" : "log";
      console[consoleMethod](JSON.stringify(entry));
    }
  };
}

function createLogger(bindings: Record<string, unknown> = {}): Logger {
  return {
    trace: createLogFn("trace", bindings),
    debug: createLogFn("debug", bindings),
    info: createLogFn("info", bindings),
    warn: createLogFn("warn", bindings),
    error: createLogFn("error", bindings),
    fatal: createLogFn("fatal", bindings),
    child: (childBindings: Record<string, unknown>) =>
      createLogger({ ...bindings, ...childBindings }),
    level: configuredLevel,
  };
}

// Create the base logger
const logger = createLogger();

/**
 * Generate a unique request ID for tracing
 */
export function generateRequestId(): string {
  return randomUUID();
}

/**
 * Create a child logger with a specific request ID
 * Use this for request-scoped logging
 */
export function createRequestLogger(requestId?: string): Logger {
  const reqId = requestId || generateRequestId();
  return logger.child({ requestId: reqId });
}

/**
 * Create a child logger for a specific module/component
 */
export function createModuleLogger(moduleName: string): Logger {
  return logger.child({ module: moduleName });
}

/**
 * Log an API request with standard fields
 */
export function logApiRequest(
  log: Logger,
  method: string,
  path: string,
  statusCode: number,
  durationMs: number,
  extra?: Record<string, unknown>
): void {
  const logData = {
    type: "api_request",
    method,
    path,
    statusCode,
    durationMs,
    ...extra,
  };
  const message = `${method} ${path} ${statusCode} ${durationMs}ms`;

  if (statusCode >= 500) {
    log.error(logData, message);
  } else if (statusCode >= 400) {
    log.warn(logData, message);
  } else {
    log.info(logData, message);
  }
}

/**
 * Log a database operation
 */
export function logDbOperation(
  log: Logger,
  operation: string,
  table: string,
  durationMs: number,
  success: boolean,
  error?: Error
): void {
  if (success) {
    log.debug({
      type: "db_operation",
      operation,
      table,
      durationMs,
      success,
    }, `DB ${operation} on ${table} completed in ${durationMs}ms`);
  } else {
    log.error({
      type: "db_operation",
      operation,
      table,
      durationMs,
      success,
      error: error?.message,
      stack: error?.stack,
    }, `DB ${operation} on ${table} failed: ${error?.message}`);
  }
}

/**
 * Log an external service call
 */
export function logExternalCall(
  log: Logger,
  service: string,
  endpoint: string,
  statusCode: number,
  durationMs: number,
  error?: Error
): void {
  const logData = {
    type: "external_call",
    service,
    endpoint,
    statusCode,
    durationMs,
    error: error?.message,
  };
  const message = `External call to ${service} ${endpoint} returned ${statusCode} in ${durationMs}ms`;

  if (error) {
    log.error(logData, message);
  } else if (statusCode >= 400) {
    log.warn(logData, message);
  } else {
    log.debug(logData, message);
  }
}

// Export the base logger
export default logger;

// Named exports for common log levels (convenience)
export const logInfo = logger.info.bind(logger);
export const logWarn = logger.warn.bind(logger);
export const logError = logger.error.bind(logger);
export const logDebug = logger.debug.bind(logger);

// Export type for use in other modules
export type { Logger };
