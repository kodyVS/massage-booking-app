import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

/**
 * Per-IP rate limiting for hot public endpoints (`/api/holds`, `/api/bookings`).
 *
 * Uses Upstash Redis when `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`
 * are set. In local dev (or when Upstash is not configured) it falls back to a
 * process-local in-memory limiter so the developer can still verify the gate
 * without standing up a Redis instance. This fallback is per-process — fine
 * for dev, useless in serverless prod, which is exactly what we want
 * (configure Upstash before going live).
 */

const WINDOW = "1 m";
const MAX_REQUESTS = 5;

const url = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;

let limiter: { limit(key: string): Promise<{ success: boolean; reset: number }> };

if (url && token) {
  const redis = new Redis({ url, token });
  const ratelimit = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(MAX_REQUESTS, WINDOW),
    prefix: "vt:rl",
    analytics: false,
  });
  limiter = {
    async limit(key: string) {
      const r = await ratelimit.limit(key);
      return { success: r.success, reset: r.reset };
    },
  };
} else {
  // In-memory fallback for local dev only.
  const buckets = new Map<string, { count: number; reset: number }>();
  limiter = {
    async limit(key: string) {
      const now = Date.now();
      const windowMs = 60_000;
      const cur = buckets.get(key);
      if (!cur || cur.reset < now) {
        buckets.set(key, { count: 1, reset: now + windowMs });
        return { success: true, reset: now + windowMs };
      }
      cur.count += 1;
      if (cur.count > MAX_REQUESTS) {
        return { success: false, reset: cur.reset };
      }
      return { success: true, reset: cur.reset };
    },
  };
}

/**
 * Best-effort client IP extraction. Vercel sets `x-forwarded-for`; local dev
 * may have nothing — fall back to a stable string so dev still rate-limits.
 */
export function clientIpFrom(headers: Headers): string {
  const fwd = headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  const real = headers.get("x-real-ip");
  if (real) return real.trim();
  return "unknown";
}

/**
 * Apply the rate limit. Returns `null` if the request is allowed; otherwise
 * returns a Response object the route handler should return immediately.
 */
export async function rateLimitOrFail(
  bucket: string,
  key: string,
): Promise<Response | null> {
  const { success, reset } = await limiter.limit(`${bucket}:${key}`);
  if (success) return null;
  const retryAfterSec = Math.max(1, Math.ceil((reset - Date.now()) / 1000));
  return new Response(
    JSON.stringify({
      ok: false,
      error: {
        code: "RATE_LIMITED",
        message: "Too many requests. Please try again shortly.",
      },
    }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": String(retryAfterSec),
      },
    },
  );
}
