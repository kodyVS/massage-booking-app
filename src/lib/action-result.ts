import { BackendError } from "@/backend";
import { ZodError } from "zod";

/**
 * Standard envelope for server-action results. Client forms can switch on
 * `ok` to display the toast / inline error.
 */
export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string; code?: string };

/**
 * Wrap a server-action body so typed backend errors and Zod failures map to
 * a clean `{ ok: false, error }` instead of stack traces or 500s. Keeps the
 * callsite small (just `return runAction(async () => …)`) so the action stays
 * under the 25-line target.
 */
export async function runAction<T>(
  fn: () => Promise<T>,
): Promise<ActionResult<T>> {
  try {
    const data = await fn();
    return { ok: true, data };
  } catch (err) {
    if (err instanceof ZodError) {
      const first = err.issues[0];
      return {
        ok: false,
        error: first?.message ?? "Invalid input",
        code: "VALIDATION_ERROR",
      };
    }
    if (err instanceof BackendError) {
      return { ok: false, error: err.message, code: err.code };
    }
    if (err instanceof Error) {
      return { ok: false, error: err.message };
    }
    return { ok: false, error: "Unexpected error" };
  }
}
