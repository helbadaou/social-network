import { NextRequest, NextResponse } from "next/server";

const PUBLIC_ROUTE = ["/login", "/register"];

/**
 *
 * @param {NextRequest} req
 */
export async function middleware(req) {
  const pathname = req.nextUrl;

  const isPublicRoute = PUBLIC_ROUTE.includes(pathname.pathname);

  const token = req.cookies.get("token");
  if (!token && !isPublicRoute) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const returnRes = NextResponse.redirect(new URL("/login", req.url));

  if (token) {
    try {
      const res = await fetch("http://localhost:8000/api/auth/me", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token.value}`,
        },
      });

      if (res.ok) {
        if (isPublicRoute) {
          return NextResponse.redirect(new URL("/", req.url));
        }
      } else {
        returnRes?.cookies?.delete("token");
        return returnRes;
      }
    } catch (error) {
      console.log("Auth check failed:", error);
      returnRes?.cookies?.delete("token");
      return returnRes;
    }
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/).*)"],
};
