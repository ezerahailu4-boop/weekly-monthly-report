import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/constants";
import { rateLimit } from "@/lib/rateLimit";

const PUBLIC_PATHS = [
  "/login",
  "/logout",
  "/",
  "/auth",
  "/api/auth",
  "/api/telegram/webhook",
  "/api/cron",
  "/icon",
  "/apple-icon",
];

const RATE_LIMIT_CONFIG: Record<string, { max: number; windowMs: number }> = {
  "/api/auth/login": { max: 5, windowMs: 60 * 1000 },
  "/api/admin": { max: 30, windowMs: 60 * 1000 },
  "/api/tasks": { max: 60, windowMs: 60 * 1000 },
  "/api/directives": { max: 30, windowMs: 60 * 1000 },
  "/api/reports": { max: 30, windowMs: 60 * 1000 },
  "/api/plans": { max: 30, windowMs: 60 * 1000 },
  "/api/warnings": { max: 20, windowMs: 60 * 1000 },
};

function rateLimitFor(pathname: string, request: Request) {
  const matchedPrefix = Object.keys(RATE_LIMIT_CONFIG).find((key) =>
    pathname.startsWith(key)
  );
  if (!matchedPrefix) return null;
  return rateLimit(request, {
    ...RATE_LIMIT_CONFIG[matchedPrefix],
    scope: `edge:${matchedPrefix}`,
  });
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Block public signup
  if (pathname === "/signup" || pathname.startsWith("/signup/")) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("notice", "no-signup");
    return NextResponse.redirect(loginUrl);
  }

  // Edge-level rate limiting for sensitive routes
  const limit = rateLimitFor(pathname, request);
  if (limit && !limit.success) {
    const retryAfter = Math.max(1, Math.ceil((limit.reset - Date.now()) / 1000));
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      {
        status: 429,
        headers: { "Retry-After": String(retryAfter) },
      }
    );
  }

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const isPublic = PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );

  if (!token && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
