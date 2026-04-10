import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyToken, isAuthEnabled, COOKIE_NAME } from "@/lib/auth";

export async function middleware(request: NextRequest) {
  if (!isAuthEnabled()) return NextResponse.next();

  const { pathname } = request.nextUrl;
  if (pathname.startsWith("/api/auth/")) return NextResponse.next();

  const token = request.cookies.get(COOKIE_NAME)?.value;
  const validToken = token ? await verifyToken(token) : false;

  if (pathname === "/login") {
    if (validToken) return NextResponse.redirect(new URL("/", request.url));
    return NextResponse.next();
  }

  const isApi = pathname.startsWith("/api/");

  if (!validToken) {
    if (isApi) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const url = new URL("/login", request.url);
    url.searchParams.set("from", pathname);
    const res = NextResponse.redirect(url);
    res.cookies.set(COOKIE_NAME, "", { maxAge: 0, path: "/" });
    return res;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/login", "/api/moment/:path*", "/api/auth/:path*"],
};
