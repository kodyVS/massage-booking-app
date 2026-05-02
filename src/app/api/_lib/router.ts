/**
 * Lightweight path matcher for catch-all route handlers.
 *
 * Match path parts against a pattern like "bookings/:id".
 * Returns a param map on match, or null if no match.
 *
 * @example
 * match(["bookings", "abc123"], "bookings/:id") // { id: "abc123" }
 * match(["bookings", "ics"], "bookings/:id")    // { id: "ics" } — order matters
 * match(["bookings"], "bookings")               // {}
 */
export function match(
  parts: string[],
  pattern: string,
): Record<string, string> | null {
  const segs = pattern === "" ? [] : pattern.split("/");
  if (parts.length !== segs.length) return null;
  const params: Record<string, string> = {};
  for (let i = 0; i < segs.length; i++) {
    if (segs[i].startsWith(":")) {
      params[segs[i].slice(1)] = parts[i];
    } else if (segs[i] !== parts[i]) {
      return null;
    }
  }
  return params;
}
