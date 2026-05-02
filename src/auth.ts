import NextAuth, { type DefaultSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { authController, ValidationError } from "@/backend";
import { authConfig } from "@/auth.config";

/**
 * Node-runtime NextAuth instance. The credentials provider's `authorize`
 * delegates to `authController.verifyCredentials` — the only place where
 * NextAuth and the backend module meet. Used by the route handler and
 * server actions; the middleware uses the edge-safe config in
 * `src/auth.config.ts` instead so it doesn't pull Mongoose into Edge.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        try {
          const user = await authController.verifyCredentials({
            input: {
              email: String(credentials.email),
              password: String(credentials.password),
            },
          });
          return {
            id: user.id,
            email: user.email,
            role: user.role,
            therapistId: user.therapistId,
          };
        } catch (err) {
          if (err instanceof ValidationError) return null;
          // UnauthorizedError or anything else — surface as failed login.
          return null;
        }
      },
    }),
  ],
});

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role?: "admin" | "worker";
      therapistId?: string;
    } & DefaultSession["user"];
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    userId?: string;
    role?: "admin" | "worker";
    therapistId?: string;
  }
}
