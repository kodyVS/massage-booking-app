import { auth } from "@/auth";
import type { RequestContext } from "@/backend";
import { UnauthorizedError } from "@/backend";

/**
 * Build a `RequestContext` for backend controllers from the NextAuth session.
 * Throws `UnauthorizedError` when there is no authenticated staff session -
 * `runAction` maps that to `{ ok: false, error: "..." }`.
 *
 * Used by every server action under `(admin)/` and `(portal)/`.
 */
export async function getStaffContext(): Promise<RequestContext> {
  const session = await auth();
  if (!session?.user?.role) {
    throw new UnauthorizedError("Authentication required");
  }
  return {
    userId: session.user.id,
    role: session.user.role,
    therapistId: session.user.therapistId,
  };
}
