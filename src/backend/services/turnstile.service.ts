import { ValidationError } from "../types/errors";

/**
 * Cloudflare Turnstile server-side verification.
 *
 * Posts the user-submitted token to Cloudflare's siteverify endpoint with the
 * server secret. Returns true on success, throws `ValidationError` on failure.
 *
 * Local-dev convenience: Cloudflare publishes "always passes" / "always fails"
 * test keys (1x.../2x... / 3x...). Pair them with the matching test secret in
 * `.env.local`. The endpoint behaves the same way for tests vs. real keys.
 *
 * If `TURNSTILE_SECRET_KEY` is not set (e.g. very early bootstrap before env
 * is wired), this no-ops and logs a warning. Once the env var is set in
 * production, it is enforced.
 */
const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

interface SiteverifyResponse {
  success: boolean;
  "error-codes"?: string[];
  challenge_ts?: string;
  hostname?: string;
  action?: string;
  cdata?: string;
}

export async function verifyToken(
  token: string | undefined,
  remoteIp?: string,
): Promise<void> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    // No secret configured - fail closed: refuse the booking. We never want a
    // misconfigured prod env to silently disable bot protection.
    throw new ValidationError("Bot protection is not configured");
  }
  if (!token) {
    throw new ValidationError("Bot-protection token is required");
  }

  const body = new URLSearchParams();
  body.set("secret", secret);
  body.set("response", token);
  if (remoteIp) body.set("remoteip", remoteIp);

  let res: Response;
  try {
    res = await fetch(VERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      // Don't let a slow Cloudflare response wedge a booking submit.
      signal: AbortSignal.timeout(8_000),
    });
  } catch (err) {
    throw new ValidationError("Could not verify bot-protection token", {
      cause: err instanceof Error ? err.message : String(err),
    });
  }

  if (!res.ok) {
    throw new ValidationError(
      `Bot-protection check failed (HTTP ${res.status})`,
    );
  }

  const data = (await res.json()) as SiteverifyResponse;
  if (!data.success) {
    throw new ValidationError("Bot-protection token is invalid", {
      errorCodes: data["error-codes"],
    });
  }
}
