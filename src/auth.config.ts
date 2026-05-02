import type { NextAuthConfig } from "next-auth";

/**
 * Edge-safe NextAuth configuration. Contains the bits the middleware needs
 * (callbacks + pages) but NO providers — the credentials provider's
 * `authorize` function runs Mongoose, which Edge can't load.
 *
 * The full config in `src/auth.ts` extends this with the providers array;
 * route handlers and server actions import from there.
 */
export const authConfig = {
  trustHost: true,
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [], // filled in by `src/auth.ts`
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.userId = (user as { id?: string }).id;
        token.role = (user as { role?: "admin" | "worker" }).role;
        token.therapistId = (user as { therapistId?: string }).therapistId;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = (token.userId as string) ?? session.user.id;
        session.user.role = token.role as "admin" | "worker" | undefined;
        session.user.therapistId = token.therapistId as string | undefined;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
