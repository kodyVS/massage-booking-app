import { handlers } from "@/auth";

// Re-export NextAuth's GET/POST for the [...nextauth] route handler.
// Kept in its own file so other code doesn't accidentally pull `handlers`
// out of `@/auth` and end up wiring two NextAuth instances.
export const { GET, POST } = handlers;
