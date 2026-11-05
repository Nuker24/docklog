import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import type { UserRole } from "@prisma/client";
import { canAccessClinic, canAccessLogistics } from "@/lib/roles";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
  });

  const isSignedIn = Boolean(token);
  const isAuthPage = pathname.startsWith("/signin");
  const isPublic =
    isAuthPage ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico";

  if (!isSignedIn && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/signin";
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }

  if (isSignedIn && (pathname === "/" || isAuthPage)) {
    const role = token?.role as UserRole | undefined;
    const url = request.nextUrl.clone();
    if (role && canAccessLogistics(role) && role !== "AUDITOR") {
      url.pathname = "/logistics";
    } else if (role && canAccessClinic(role)) {
      url.pathname = "/clinic";
    } else {
      url.pathname = "/logistics";
    }
    url.search = "";
    return NextResponse.redirect(url);
  }

  if (isSignedIn && pathname.startsWith("/logistics")) {
    const role = token?.role as UserRole;
    if (!canAccessLogistics(role)) {
      const url = request.nextUrl.clone();
      url.pathname = "/clinic";
      return NextResponse.redirect(url);
    }
  }

  if (isSignedIn && pathname.startsWith("/clinic")) {
    const role = token?.role as UserRole;
    if (!canAccessClinic(role)) {
      const url = request.nextUrl.clone();
      url.pathname = "/logistics";
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
