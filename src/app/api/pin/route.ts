import { NextResponse } from "next/server";
import { PIN_COOKIE, getRequiredPin } from "@/lib/auth-pin";

export async function POST(req: Request) {
  const { pin } = await req.json();
  if (pin !== getRequiredPin()) {
    return NextResponse.json({ error: "Fel kod" }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(PIN_COOKIE, "1", {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(PIN_COOKIE);
  return res;
}
