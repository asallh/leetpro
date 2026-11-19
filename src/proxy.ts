import { NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";
import { GATE_COOKIE, gateEnabled, isValidGateToken } from "@/lib/site-gate";

const AUTH_PAGES = ["/sign-in", "/sign-up"];
const APP_PREFIXES = ["/dashboard", "/problems", "/review", "/problem-sets"];

function isAppPage(pathname: string) {
  return APP_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

// Auth endpoints a signed-in client (the extension) needs without the gate
// cookie. Neither can create an account or a session.
const SESSION_ONLY_AUTH_PATHS = ["/api/auth/get-session", "/api/auth/sign-out"];

// getSessionCookie only checks that a cookie with the right name exists, not
// that it is valid, so a session cookie must never let a request reach an
// endpoint that creates accounts or sessions. Data routes are fine: each one
// validates the session itself and returns 401 for a forged cookie.
function canSkipGateWithSession(pathname: string) {
  if (!pathname.startsWith("/api/auth/")) return true;
  return SESSION_ONLY_AUTH_PATHS.includes(pathname);
}

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const sessionCookie = getSessionCookie(request);

  // 1. Site password gate (only when SITE_PASSWORD is set).
  if (gateEnabled() && pathname !== "/gate") {
    const passedGate = await isValidGateToken(request.cookies.get(GATE_COOKIE)?.value);
    const isApi = pathname.startsWith("/api/");
    if (!passedGate && !(isApi && sessionCookie && canSkipGateWithSession(pathname))) {
      if (isApi) {
        return NextResponse.json({ error: "Site is password protected" }, { status: 401 });
      }
      const url = new URL("/gate", request.url);
      url.searchParams.set("next", `${pathname}${search}`);
      return NextResponse.redirect(url);
    }
  }

  // 2. Account auth for app pages.
  const isAuthPage = AUTH_PAGES.includes(pathname);
  if (sessionCookie && isAuthPage) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }
  if (!sessionCookie && isAppPage(pathname)) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }

  return NextResponse.next();
}

export const config = {
  // Everything except Next internals and static icon files.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon.svg|apple-icon.png|robots.txt).*)",
  ],
};
