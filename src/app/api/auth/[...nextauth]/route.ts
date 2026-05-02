/**
 * NextAuth v5 catch-all route handler. The actual configuration lives in
 * `src/auth.ts` so it can be imported by both the route handler and the
 * middleware/server actions.
 */
export { GET, POST } from "@/auth.handlers";
