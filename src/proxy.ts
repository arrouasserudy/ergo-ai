import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Optimistic check only: bounce requests without a session cookie to the login page.
 * The real authorization happens in `requireTherapist()` (lib/session.ts).
 */
export function proxy(request: NextRequest) {
  if (!getSessionCookie(request)) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!login|signup|privacy|f/|t/|api/auth|_next/static|_next/image|favicon.ico|robots.txt).*)"],
};
