/**
 * Mock for pino logger
 * This mock replaces pino in tests since pino is not installed
 */

const createMockLogger = () => ({
  info: () => {},
  error: () => {},
  warn: () => {},
  debug: () => {},
  fatal: () => {},
  trace: () => {},
  child: () => createMockLogger(),
});

const pino = Object.assign(
  () => createMockLogger(),
  {
    stdTimeFunctions: {
      isoTime: () => `,"time":"${new Date().toISOString()}"`,
    },
    default: () => createMockLogger(),
  }
);

export default pino;
export { pino };
