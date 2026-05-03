import { NextResponse, type NextRequest } from "next/server";
import { PIN_COOKIE, ACTOR_COOKIE } from "@/lib/auth-pin";

const PUBLIC_PATHS = ["/", "/pin", "/api/pin"];
const ACTOR_PATHS = ["/valj", "/api/actor"];

export async function updateSession(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const isPublic =
    PUBLIC_PATHS.includes(path) ||
    path.startsWith("/_next") ||
    path.startsWith("/favicon");
  const isActorRoute = ACTOR_PATHS.some((p) => path.startsWith(p));

  const hasPin = request.cookies.get(PIN_COOKIE)?.value === "1";
  const hasActor = !!request.cookies.get(ACTOR_COOKIE)?.value;

  if (!hasPin && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/pin";
    return NextResponse.redirect(url);
  }

  if (hasPin && !hasActor && !isPublic && !isActorRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/valj";
    return NextResponse.redirect(url);
  }

  return NextResponse.next({ request });
}
