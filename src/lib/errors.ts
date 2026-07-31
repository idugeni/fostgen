/**
 * A single, explicit taxonomy of every failure the app can surface.
 *
 * Keeping the codes in one place means the API layer, the UI copy and the tests
 * all agree on what went wrong, instead of matching on free-form messages.
 */
export const ERROR_CODES = [
  'INVALID_URL',
  'INVALID_REQUEST',
  'NOT_FOUND',
  'BRANCH_NOT_FOUND',
  'PATH_NOT_FOUND',
  'EMPTY_REPOSITORY',
  'RATE_LIMITED',
  'UNAUTHORIZED',
  'UNAVAILABLE',
  'NETWORK',
  'UPSTREAM',
  'ABORTED',
  'UNKNOWN',
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

export interface AppErrorOptions {
  /** HTTP status to use when the error is serialised by a route handler. */
  status?: number;
  /** Short, actionable next step shown underneath the message. */
  hint?: string;
  /** Seconds until the caller may retry (used for rate limits). */
  retryAfter?: number;
  cause?: unknown;
}

const DEFAULT_STATUS: Record<ErrorCode, number> = {
  INVALID_URL: 400,
  INVALID_REQUEST: 400,
  NOT_FOUND: 404,
  BRANCH_NOT_FOUND: 404,
  PATH_NOT_FOUND: 404,
  EMPTY_REPOSITORY: 422,
  RATE_LIMITED: 429,
  UNAUTHORIZED: 401,
  UNAVAILABLE: 451,
  NETWORK: 502,
  UPSTREAM: 502,
  ABORTED: 499,
  UNKNOWN: 500,
};

/** An error that carries enough metadata to be rendered to a user verbatim. */
export class AppError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly hint?: string;
  readonly retryAfter?: number;

  constructor(code: ErrorCode, message: string, options: AppErrorOptions = {}) {
    super(message, options.cause === undefined ? undefined : { cause: options.cause });
    this.name = 'AppError';
    this.code = code;
    this.status = options.status ?? DEFAULT_STATUS[code];
    this.hint = options.hint;
    this.retryAfter = options.retryAfter;
  }

  toJSON(): { code: ErrorCode; message: string; hint?: string; retryAfter?: number } {
    return {
      code: this.code,
      message: this.message,
      ...(this.hint ? { hint: this.hint } : {}),
      ...(this.retryAfter === undefined ? {} : { retryAfter: this.retryAfter }),
    };
  }
}

export function isAppError(value: unknown): value is AppError {
  return value instanceof AppError;
}

/** Narrow any thrown value into an {@link AppError} without losing detail. */
export function toAppError(value: unknown): AppError {
  if (isAppError(value)) return value;

  if (value instanceof DOMException && value.name === 'AbortError') {
    return new AppError('ABORTED', 'Request cancelled.', { cause: value });
  }

  if (value instanceof Error) {
    if (value.name === 'AbortError') {
      return new AppError('ABORTED', 'Request cancelled.', { cause: value });
    }
    return new AppError('UNKNOWN', value.message || 'An unexpected error occurred.', {
      cause: value,
    });
  }

  return new AppError('UNKNOWN', 'An unexpected error occurred.', { cause: value });
}
