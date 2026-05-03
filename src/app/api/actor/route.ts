import { NextResponse } from "next/server";
import { ACTOR_COOKIE } from "@/lib/auth-pin";

export async function POST(req: Request) {
  const { id, name } = await req.json();
  if (!id || !name) {
    return NextResponse.json({ error: "id och name krävs" }, { status: 400 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(
    ACTOR_COOKIE,
    encodeURIComponent(JSON.stringify({ id, name })),
    {
      path: "/",
      httpOnly: false,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30,
    }
  );
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(ACTOR_COOKIE);
  return res;
}
