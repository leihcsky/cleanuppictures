import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

const intlMiddleware = createMiddleware(routing);

export default function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  if (pathname === "/zh" || pathname.startsWith("/zh/")) {
    const url = request.nextUrl.clone();
    url.pathname = pathname === "/zh" ? "/" : pathname.slice("/zh".length);
    if (!url.pathname.startsWith("/")) {
      url.pathname = `/${url.pathname}`;
    }
    return NextResponse.redirect(url, 308);
  }
  return intlMiddleware(request);
}

export const config = {
  matcher: [
    // Enable a redirect to a matching locale at the root
    "/",

    // Locale-prefixed paths (keep `zh` so old /zh/* URLs hit middleware and redirect)
    "/(en|zh)/:path*",

    // Enable redirects that add missing locales
    // (e.g. `/pathnames` -> `/en/pathnames`)
    "/((?!api/creem/webhook|_next|_vercel|.*\\..*).*)",
  ],
};
