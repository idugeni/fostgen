/* eslint-disable no-console -- this module is the single sanctioned console sink */

/**
 * A dependency-free, isomorphic logger.
 *
 * This replaces the previous `winston` + `express` middleware setup, which could
 * never run in this codebase: Next.js route handlers are not Express, and
 * bundling winston into a client-imported module breaks the build.
 */
export const LOG_LEVELS = ['debug', 'info', 'warn', 'error', 'silent'] as const;

export type LogLevel = (typeof LOG_LEVELS)[number];

const WEIGHT: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
  silent: 100,
};

function isLogLevel(value: string | undefined): value is LogLevel {
  return value !== undefined && (LOG_LEVELS as readonly string[]).includes(value);
}

function resolveLevel(): LogLevel {
  const fromEnv = process.env.LOG_LEVEL?.toLowerCase();
  if (isLogLevel(fromEnv)) return fromEnv;
  if (process.env.NODE_ENV === 'test') return 'silent';
  return process.env.NODE_ENV === 'production' ? 'info' : 'debug';
}

type Context = Record<string, unknown>;

function serialise(level: LogLevel, message: string, context?: Context): unknown[] {
  const timestamp = new Date().toISOString();

  if (process.env.NODE_ENV === 'production') {
    return [JSON.stringify({ timestamp, level, message, ...context })];
  }

  return context === undefined
    ? [`[${level}] ${message}`]
    : [`[${level}] ${message}`, context];
}

function emit(level: Exclude<LogLevel, 'silent'>, message: string, context?: Context): void {
  if (WEIGHT[level] < WEIGHT[resolveLevel()]) return;

  const args = serialise(level, message, context);
  if (level === 'error') console.error(...args);
  else if (level === 'warn') console.warn(...args);
  else console.log(...args);
}

export const logger = {
  debug: (message: string, context?: Context) => emit('debug', message, context),
  info: (message: string, context?: Context) => emit('info', message, context),
  warn: (message: string, context?: Context) => emit('warn', message, context),
  error: (message: string, context?: Context) => emit('error', message, context),
};

export type Logger = typeof logger;
