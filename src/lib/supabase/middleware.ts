import { NextResponse, type NextRequest } from "next/server";
import { PIN_COOKIE } from "@/lib/auth-pin";

const PUBLIC_PATHS = ["/", "/pin", "/api/pin"];

export async function updateSession(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const isPublic =
    PUBLIC_PATHS.includes(path) ||
    path.startsWith("/_next") ||
    path.startsWith("/favicon");

  const hasPin = request.cookies.get(PIN_COOKIE)?.value === "1";

  if (!hasPin && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/pin";
    return NextResponse.redirect(url);
  }

  return NextResponse.next({ request });
}
