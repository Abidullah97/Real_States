import { NextResponse, type NextRequest } from "next/server";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/**
 * CSRF defence for state-changing API requests: browsers always attach Origin (and Sec-Fetch-Site)
 * to cross-site POST/PATCH/DELETE requests, so anything not from this site is rejected before it
 * reaches a route handler. Auth.js endpoints use their own CSRF tokens and are excluded.
 */
export function proxy(request: NextRequest) {
  if (SAFE_METHODS.has(request.method) || request.nextUrl.pathname.startsWith("/api/auth/")) return NextResponse.next();

  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  const origin = request.headers.get("origin");
  if (origin) {
    let originHost = "";
    try {
      originHost = new URL(origin).host;
    } catch {}
    if (!host || originHost !== host) return NextResponse.json({ error: "Cross-site request blocked." }, { status: 403 });
  } else if (request.headers.get("sec-fetch-site") === "cross-site") {
    return NextResponse.json({ error: "Cross-site request blocked." }, { status: 403 });
  }
  return NextResponse.next();
}

export const config = { matcher: "/api/:path*" };
