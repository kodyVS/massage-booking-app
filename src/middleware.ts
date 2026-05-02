import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/auth.config";

/**
 * Build the edge-safe NextAuth instance from `authConfig` only - this file
 * runs in Edge runtime, which can't load Mongoose / Node built-ins. The
 * full Node-runtime instance lives in `src/auth.ts` for use by route
 * handlers and server actions.
 */
const { auth } = NextAuth(authConfig);

/**
 * Role-based gating for staff routes:
 *   - unauthenticated  → /login (with a `from` redirect param)
 *   - admin role       → /admin/* allowed; /portal/* redirects to /admin
 *   - worker role      → /portal/* allowed; /admin/* redirects to /portal
 */
export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isAdminPath = pathname.startsWith("/admin");
  const isPortalPath = pathname.startsWith("/portal");

  if (!isAdminPath && !isPortalPath) {
    return NextResponse.next();
  }

  const session = req.auth;
  if (!session?.user) {
    const url = new URL("/login", req.nextUrl.origin);
    url.searchParams.set("from", pathname);
    return NextResponse.redirect(url);
  }

  const role = session.user.role;
  if (isAdminPath && role !== "admin") {
    return NextResponse.redirect(new URL("/portal", req.nextUrl.origin));
  }
  if (isPortalPath && role !== "worker") {
    return NextResponse.redirect(new URL("/admin", req.nextUrl.origin));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/admin/:path*", "/portal/:path*"],
};
