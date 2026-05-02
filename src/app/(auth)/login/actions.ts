"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/auth";

/**
 * Thin server action wrapper around NextAuth `signIn`. The action does not
 * touch the DB directly — NextAuth's credentials provider in `src/auth.ts`
 * delegates to `authController.verifyCredentials` (which is the only entry
 * point into the backend module).
 */
export type LoginResult =
  | { ok: true; redirectTo: string }
  | { ok: false; error: string };

export async function loginAction(formData: FormData): Promise<LoginResult> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const requestedFrom = String(formData.get("from") ?? "");

  if (!email || !password) {
    return { ok: false, error: "Email and password are required." };
  }

  try {
    // `redirect: false` so we can decide where to send the user based on role.
    await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return { ok: false, error: "Invalid email or password." };
    }
    throw err;
  }

  // Where to land them — honor `from` if it points at a valid staff path,
  // otherwise default to /admin and let middleware bounce workers to /portal.
  const safeFrom =
    requestedFrom.startsWith("/admin") || requestedFrom.startsWith("/portal")
      ? requestedFrom
      : "/admin";

  return { ok: true, redirectTo: safeFrom };
}
