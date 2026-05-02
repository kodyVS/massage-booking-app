import { NextResponse } from "next/server";
import { ZodError } from "zod";
import {
  BackendError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from "@/backend";

/**
 * Maps a backend typed error to its HTTP status code.
 *
 * Add a branch here whenever a new error class is added to
 * `src/backend/types/errors.ts`.
 */
function errorToStatus(err: unknown): number {
  if (err instanceof ValidationError) return 400;
  if (err instanceof ZodError) return 400;
  if (err instanceof UnauthorizedError) return 401;
  if (err instanceof ForbiddenError) return 403;
  if (err instanceof NotFoundError) return 404;
  if (err instanceof ConflictError) return 409;
  if (err instanceof BackendError) return 400;
  return 500;
}

/** Shape of a successful JSON response. */
export type ApiSuccess<T> = { ok: true; data: T };

/** Shape of an error JSON response. */
export type ApiError = {
  ok: false;
  error: { code: string; message: string; details?: unknown };
};

/**
 * Wraps a successful payload in the standard envelope.
 *
 *   return apiOk({ booking });
 */
export function apiOk<T>(data: T, init?: ResponseInit): NextResponse<ApiSuccess<T>> {
  return NextResponse.json({ ok: true, data }, init);
}

/**
 * Translates any thrown error into a JSON error response. Backend typed
 * errors get their proper status code; unknown errors become 500 with
 * a generic message (the original error is logged for debugging).
 */
export function apiError(err: unknown): NextResponse<ApiError> {
  const status = errorToStatus(err);

  if (err instanceof BackendError) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: err.code,
          message: err.message,
          details: err.details,
        },
      },
      { status },
    );
  }

  if (err instanceof ZodError) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid request payload",
          details: err.issues,
        },
      },
      { status },
    );
  }

  // Unknown error - log on the server, return a safe message.
  console.error("[api] Unhandled error:", err);
  const message =
    err instanceof Error ? err.message : "Internal server error";
  return NextResponse.json(
    {
      ok: false,
      error: {
        code: "INTERNAL_ERROR",
        message:
          process.env.NODE_ENV === "production"
            ? "Internal server error"
            : message,
      },
    },
    { status },
  );
}

/**
 * Convenience wrapper. Use in route handlers:
 *
 *   export async function POST(req: Request) {
 *     return withApiResponse(async () => {
 *       const body = await req.json();
 *       const result = await bookingsController.create({ input: body });
 *       return result;
 *     });
 *   }
 */
export async function withApiResponse<T>(
  handler: () => Promise<T>,
): Promise<NextResponse<ApiSuccess<T> | ApiError>> {
  try {
    const data = await handler();
    return apiOk(data);
  } catch (err) {
    return apiError(err);
  }
}
