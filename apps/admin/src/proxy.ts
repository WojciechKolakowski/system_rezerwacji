import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session";

export async function proxy(request: NextRequest) {
  // /api/cron/* ma własną autoryzację przez CRON_SECRET (Vercel Cron nie
  // wysyła ciasteczka sesji admina) — patrz app/api/cron/.../route.ts.
  if (request.nextUrl.pathname.startsWith("/api/cron/")) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySessionToken(token) : null;

  if (!session || session.role !== "ADMIN") {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  // Wszystko poza /login, /api/cron/* i zasobami statycznymi — patrz
  // apps/admin/src/lib/session.ts.
  matcher: ["/((?!login|api/cron|_next/static|_next/image|favicon.ico).*)"],
};
