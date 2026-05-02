/**
 * Typed error classes used across the backend module.
 *
 * Throw these from services/controllers; the route layer uses
 * `src/lib/api-response.ts` to translate them into HTTP responses.
 *
 * Adding a new error class? Also extend `errorToHttp()` in
 * `src/lib/api-response.ts` so the route layer knows how to map it.
 */

/** Base class — every backend error extends this so callers can `instanceof` check. */
export class BackendError extends Error {
  /** Stable string code, useful for client-side branching. */
  public readonly code: string;
  /** Optional payload (validation issues, conflict details, etc.). */
  public readonly details?: unknown;

  constructor(code: string, message: string, details?: unknown) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.details = details;
    // Maintain a clean stack trace for V8.
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

/** Resource not found (404). */
export class NotFoundError extends BackendError {
  constructor(message = "Resource not found", details?: unknown) {
    super("NOT_FOUND", message, details);
  }
}

/** Conflicting state — e.g. double-booked slot, duplicate email (409). */
export class ConflictError extends BackendError {
  constructor(message = "Conflict", details?: unknown) {
    super("CONFLICT", message, details);
  }
}

/** Input validation failed — Zod issues, malformed payloads (400). */
export class ValidationError extends BackendError {
  constructor(message = "Invalid input", details?: unknown) {
    super("VALIDATION_ERROR", message, details);
  }
}

/** Caller is not authenticated (401). */
export class UnauthorizedError extends BackendError {
  constructor(message = "Authentication required", details?: unknown) {
    super("UNAUTHORIZED", message, details);
  }
}

/** Caller is authenticated but lacks permission for the action (403). */
export class ForbiddenError extends BackendError {
  constructor(message = "Forbidden", details?: unknown) {
    super("FORBIDDEN", message, details);
  }
}
